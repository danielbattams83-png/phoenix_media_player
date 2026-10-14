import { Track, MediaFormat } from '../types';

const ACCENT_PALETTE = [
  { color: '#6366f1', glow: 'rgba(99, 102, 241, 0.45)' }, // Indigo
  { color: '#ec4899', glow: 'rgba(236, 72, 153, 0.45)' }, // Pink
  { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)' }, // Amber
  { color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.45)' },  // Cyan
  { color: '#10b981', glow: 'rgba(16, 185, 129, 0.45)' }, // Emerald
  { color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.45)' }, // Purple
  { color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.45)' },  // Rose
  { color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.45)' }, // Blue
];

const DEFAULT_COVER_ARTS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=800&auto=format&fit=crop',
];

/**
 * Format bytes into human readable MB/KB string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Parses raw file into a Track object with media duration and object URL
 */
export async function parseFileToTrack(file: File, indexOffset: number = 0): Promise<Track> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toUpperCase() || 'MP3';
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  
  let artist = 'Local Artist';
  let title = nameWithoutExt;
  let album = 'Local Audio Import';

  // Check if filename is "Artist - Title" format
  if (nameWithoutExt.includes(' - ')) {
    const parts = nameWithoutExt.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }

  const isVideo = file.type.startsWith('video/') || ['MP4', 'WEBM', 'MKV'].includes(ext);
  const mediaType: 'audio' | 'video' = isVideo ? 'video' : 'audio';

  // Create Object URL for true browser streaming & playback
  const mediaUrl = URL.createObjectURL(file);

  // Extract duration using offscreen HTMLMediaElement
  const duration = await new Promise<number>((resolve) => {
    const mediaEl = document.createElement(isVideo ? 'video' : 'audio');
    mediaEl.preload = 'metadata';
    mediaEl.src = mediaUrl;

    const timeout = setTimeout(() => {
      resolve(180); // 3 min fallback if cannot probe
    }, 3000);

    mediaEl.onloadedmetadata = () => {
      clearTimeout(timeout);
      resolve(mediaEl.duration && !isNaN(mediaEl.duration) ? Math.round(mediaEl.duration) : 180);
    };

    mediaEl.onerror = () => {
      clearTimeout(timeout);
      resolve(180);
    };
  });

  const palette = ACCENT_PALETTE[indexOffset % ACCENT_PALETTE.length];
  const coverArt = DEFAULT_COVER_ARTS[indexOffset % DEFAULT_COVER_ARTS.length];

  let format: MediaFormat = 'MP3';
  if (['FLAC', 'WAV', 'AAC', 'OGG', 'M4A', 'MP4', 'WEBM'].includes(ext)) {
    format = ext as MediaFormat;
  }

  return {
    id: `local-file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    title: title.toUpperCase(),
    artist,
    album,
    duration,
    genre: isVideo ? 'Video / Media' : 'Local File',
    year: new Date(file.lastModified || Date.now()).getFullYear(),
    format,
    bitrate: format === 'FLAC' || format === 'WAV' ? '1411 kbps (Lossless)' : '320 kbps High Quality',
    sampleRate: '48.0 kHz / 24-bit PCM',
    fileSize: formatBytes(file.size),
    path: `C:\\Users\\Media\\Music\\${file.name}`,
    coverArt,
    accentColor: palette.color,
    glowRgba: palette.glow,
    isFavorite: false,
    synopsis: `Imported from local disk: "${file.name}" (${formatBytes(file.size)}). Ready for hardware-accelerated playback.`,
    mediaUrl,
    mediaType,
    fileRef: file,
    isLocal: true,
    lyrics: [
      `Local track loaded from browser filesystem: ${file.name}`,
      `Format: ${format} • Size: ${formatBytes(file.size)}`,
      `Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
      `Decoded with HTML5 ${isVideo ? '<video>' : '<audio>'} Engine`
    ]
  };
}

/**
 * Open files using window.showOpenFilePicker or input[type=file] fallback
 */
export async function openLocalMediaFiles(): Promise<File[]> {
  const supportedTypes = [
    {
      description: 'Audio & Video Files',
      accept: {
        'audio/*': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'],
        'video/*': ['.mp4', '.webm', '.mkv']
      }
    }
  ];

  // Try modern File System Access API
  if ('showOpenFilePicker' in window) {
    try {
      const handles = await (window as unknown as {
        showOpenFilePicker: (options: {
          multiple?: boolean;
          types?: typeof supportedTypes;
        }) => Promise<Array<{ getFile: () => Promise<File> }>>;
      }).showOpenFilePicker({
        multiple: true,
        types: supportedTypes
      });

      const files: File[] = [];
      for (const handle of handles) {
        const f = await handle.getFile();
        files.push(f);
      }
      return files;
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return []; // User cancelled picker
      }
      console.warn('showOpenFilePicker failed or unsupported, falling back to input:', err);
    }
  }

  // Fallback: standard input[type="file"] element
  return new Promise<File[]>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*,video/*,.mp3,.wav,.flac,.aac,.ogg,.m4a,.mp4,.webm';

    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        resolve(Array.from(input.files));
      } else {
        resolve([]);
      }
    };

    input.oncancel = () => {
      resolve([]);
    };

    input.click();
  });
}
