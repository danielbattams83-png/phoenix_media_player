export type MediaFormat = 'FLAC' | 'MP3' | 'WAV' | 'AAC' | 'OGG' | 'M4A' | 'MP4' | 'WEBM';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  genre: string;
  year: number;
  format: MediaFormat;
  bitrate: string;
  sampleRate: string;
  fileSize: string;
  path: string;
  coverArt: string;
  accentColor: string; // Hex for dynamic glow
  glowRgba: string;
  isFavorite: boolean;
  synopsis?: string;
  lyrics?: string[];
  // Real media playback fields
  mediaUrl?: string;
  mediaType: 'audio' | 'video';
  fileRef?: File;
  isLocal?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  trackCount: number;
  coverArt: string;
  accentColor: string;
  description: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  trackCount: number;
  coverArt: string;
}

export interface EqualizerBand {
  freq: number;
  label: string;
  gain: number;
  type: BiquadFilterType;
}

export interface EqualizerPreset {
  name: string;
  bands: number[]; // 5 bands: 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz
}
