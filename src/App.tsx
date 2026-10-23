import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Play,
  Heart,
  ListMusic,
  Folder,
  Mic2,
  Sliders,
  X,
  HardDrive,
  ChevronRight,
  ArrowUpDown,
  Menu,
  Film,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Track, Playlist, EqualizerPreset, PlayerView, ImageAsset, ImageCollection } from './types';
import { openLocalMediaFiles, openLocalMediaFolder, parseFileToTrack, formatBytes } from './utils/filePicker';
import {
  deleteImage,
  loadImageCollections,
  loadImages,
  loadImportedTracks,
  loadPlaylists,
  loadSettings,
  requestPersistentStorage,
  saveImage,
  saveImageCollections,
  saveImportedTrack,
  savePlaylists,
  saveSettings
} from './utils/persistence';
import { EqualizerModal } from './components/EqualizerModal';
import { AppSidebar } from './components/AppSidebar';
import { PlayerHeader } from './components/PlayerHeader';
import { AudioVisualizer } from './components/AudioVisualizer';
import { MiniVisualizer } from './components/MiniVisualizer';
import { PlaybackBar } from './components/PlaybackBar';
import { VideoPlayerView } from './components/VideoPlayerView';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { PlaylistsView } from './components/PlaylistsView';
import { ImagesView } from './components/ImagesView';
import { SpotifyView } from './components/SpotifyView';
import { MagneticLogo } from './components/MagneticLogo';
import { ListeningHome } from './components/ListeningHome';
import { QueuePanel } from './components/QueuePanel';
import { useMediaSession } from './components/useMediaSession';
import { ContinueListening } from './components/ContinueListening';
import { collectDroppedFiles, fileIdentity, isMediaFile } from './utils/mediaImport';
import { loadListeningHistory, saveListeningEntry, type ListeningEntry } from './utils/persistence';
import type { RotationalHubDestination } from './components/RotationalHub';

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// ==========================================
// PLAYER SETTINGS
// ==========================================

const EQUALIZER_PRESETS: EqualizerPreset[] = [
  { name: 'Flat', bands: [0, 0, 0, 0, 0] },
  { name: 'Bass Boost', bands: [6, 4, 1, 0, 0] },
  { name: 'Acoustic', bands: [2, 1, 3, 4, 3] },
  { name: 'Electronic', bands: [5, 3, 0, 3, 5] },
  { name: 'Vocal / Clarity', bands: [-2, 1, 4, 3, 1] },
  { name: 'Spatial Immersive', bands: [3, 2, -1, 3, 4] }
];

const EMPTY_TRACK: Track = {
  id: '',
  title: 'No track selected',
  artist: '',
  album: '',
  duration: 0,
  genre: '',
  year: 0,
  format: 'MP3',
  bitrate: '',
  sampleRate: '',
  fileSize: '',
  path: '',
  coverArt: '',
  accentColor: '#6366f1',
  glowRgba: 'rgba(99, 102, 241, 0.45)',
  isFavorite: false,
  mediaType: 'audio'
};

export default function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<PlayerView>('now-playing');
  const [selectedSidebar, setSelectedSidebar] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('code') || params.has('error') ? 'spotify' : 'home';
  });
  const [activePlayerMode, setActivePlayerMode] = useState<RotationalHubDestination>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('code') || params.has('error') ? 'spotify' : 'local-files';
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [showQueueDrawer, setShowQueueDrawer] = useState<boolean>(false);
  const [upNext, setUpNext] = useState<string[]>([]);
  const [sleepDeadline, setSleepDeadline] = useState<number | null>(null);
  const [sleepRemaining, setSleepRemaining] = useState(0);
  const [showLyricsPanel, setShowLyricsPanel] = useState<boolean>(false);
  const [showEqualizerModal, setShowEqualizerModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'title' | 'artist' | 'duration' | 'bitrate'>('title');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Playback Engine State
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [playlistQueueIds, setPlaylistQueueIds] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [imageCollections, setImageCollections] = useState<ImageCollection[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [history, setHistory] = useState<ListeningEntry[]>([]);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [importSummary, setImportSummary] = useState('');
  const importing = useRef(false);
  const [isFileDrag, setIsFileDrag] = useState(false);
  const dragDepth = useRef(0);
  const pendingResume = useRef<{ id: string; position: number } | null>(null);
  const lastHistorySave = useRef(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [volume, setVolume] = useState<number>(75);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('all');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [audioDevice] = useState<string>('Browser audio output');
  const [selectedEqPreset, setSelectedEqPreset] = useState<string>('Spatial Immersive');
  const [eqBands, setEqBands] = useState<number[]>([3, 2, -1, 3, 4]);

  // Audio & Video Refs (Hidden Media Engines)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const appRootRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isDraggingScrubber = useRef<boolean>(false);

  // Web Audio Context & Nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const biquadFiltersRef = useRef<BiquadFilterNode[]>([]);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const currentTrack = tracks[currentTrackIndex] ?? tracks[0] ?? EMPTY_TRACK;

  const albums = useMemo(() => {
    const albumsByKey = new Map<string, { title: string; artist: string; year: number; coverArt: string; trackIds: string[] }>();
    tracks.forEach((track) => {
      const title = track.album.trim() || 'Unknown Album';
      const artist = track.artist.trim() || 'Unknown Artist';
      const key = `${artist.toLocaleLowerCase()}\0${title.toLocaleLowerCase()}`;
      const album = albumsByKey.get(key);
      if (album) {
        album.trackIds.push(track.id);
      } else {
        albumsByKey.set(key, {
          title,
          artist,
          year: track.year,
          coverArt: track.coverArt,
          trackIds: [track.id]
        });
      }
    });
    return Array.from(albumsByKey.entries()).map(([id, album]) => ({ id, ...album }));
  }, [tracks]);

  useEffect(() => {
    if (activeTab === 'youtube') {
      setActivePlayerMode('youtube');
      audioRef.current?.pause();
      videoRef.current?.pause();
      setIsPlaying(false);
    } else if (activeTab === 'file-browser') {
      setActivePlayerMode('local-files');
    } else if (activeTab === 'now-playing' && selectedSidebar === 'spotify') {
      setActivePlayerMode('spotify');
      audioRef.current?.pause();
      videoRef.current?.pause();
      setIsPlaying(false);
    } else if (activeTab === 'now-playing' && selectedSidebar === 'home') {
      setActivePlayerMode('local-files');
    }
  }, [activeTab, selectedSidebar]);

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  const handleNavigateToSearch = () => {
    setSelectedSidebar('search');
    setActiveTab('file-browser');
    setIsMobileNavOpen(false);
    window.setTimeout(() => searchInputRef.current?.focus(), 220);
  };

  const handleSearchFocus = () => {
    setSelectedSidebar('search');
    setActiveTab('file-browser');
  };

  const handleLogoHome = () => {
    setSelectedSidebar('home');
    setActiveTab(currentTrack.mediaType === 'video' ? 'video-player' : 'now-playing');
    setIsMobileNavOpen(false);
  };

  useEffect(() => {
    let active = true;
    const restoreSavedData = async () => {
      try {
        const isInstalledApp = window.matchMedia('(display-mode: standalone)').matches
          || (navigator as Navigator & { standalone?: boolean }).standalone === true;
        let persistence: 'granted' | 'denied' | 'unsupported' = 'unsupported';
        try {
          persistence = await requestPersistentStorage();
        } catch (error) {
          console.warn('Could not request persistent device storage:', error);
        }
        if (active && isInstalledApp && persistence !== 'granted') {
          showToast('Device storage protection is unavailable. Your browser may clear saved media if storage is low.');
        }
        const [savedTracks, savedImages] = await Promise.all([loadImportedTracks(), loadImages()]);
        const savedPlaylists = loadPlaylists();
        const savedCollections = loadImageCollections();
        const settings = loadSettings({
          volume: 75,
          isMuted: false,
          isShuffle: false,
          repeatMode: 'all',
          playbackSpeed: 1,
          selectedEqPreset: 'Spatial Immersive',
          eqBands: [3, 2, -1, 3, 4],
        });
        if (!active) {
          savedTracks.forEach((track) => track.mediaUrl && URL.revokeObjectURL(track.mediaUrl));
          savedImages.forEach((image) => URL.revokeObjectURL(image.url));
          return;
        }
        setTracks((current) => [...current, ...savedTracks.filter((saved) => !current.some((track) => track.id === saved.id))]);
        setImages(savedImages);
        try {
          const savedHistory = await loadListeningHistory();
          if (active) setHistory(savedHistory);
        } catch { showToast('Listening history could not be restored.'); }
        setPlaylists(savedPlaylists);
        setImageCollections(savedCollections);
        setVolume(settings.volume);
        setIsMuted(settings.isMuted);
        setIsShuffle(settings.isShuffle);
        setRepeatMode(settings.repeatMode);
        setPlaybackSpeed(settings.playbackSpeed);
        setSelectedEqPreset(settings.selectedEqPreset);
        setEqBands(settings.eqBands);
      } catch (error) {
        console.error('Could not restore saved player data:', error);
        showToast('Some saved player data could not be restored. Check browser storage and try again.');
      } finally {
        if (active) setStorageReady(true);
      }
    };
    void restoreSavedData();
    return () => {
      active = false;
    };
  }, [showToast]);

  useEffect(() => {
    if (!storageReady) return;
    void Promise.all(tracks.filter((track) => track.isLocal && track.fileRef).map(saveImportedTrack))
      .catch((error: unknown) => {
        console.error('Could not persist imported tracks:', error);
        showToast('Could not save imported media. Browser storage may be full.');
      });
  }, [tracks, storageReady, showToast]);

  useEffect(() => {
    if (!storageReady) return;
    try {
      savePlaylists(playlists);
    } catch (error) {
      console.error('Could not persist playlists:', error);
      showToast('Could not save playlists. Check browser storage.');
    }
  }, [playlists, storageReady, showToast]);

  useEffect(() => {
    if (!storageReady) return;
    try {
      saveImageCollections(imageCollections);
    } catch (error) {
      console.error('Could not persist image collections:', error);
      showToast('Could not save image collections. Check browser storage.');
    }
  }, [imageCollections, storageReady, showToast]);

  useEffect(() => {
    if (!storageReady) return;
    try {
      saveSettings({ volume, isMuted, isShuffle, repeatMode, playbackSpeed, selectedEqPreset, eqBands });
    } catch (error) {
      console.error('Could not persist player settings:', error);
      showToast('Could not save player settings. Check browser storage.');
    }
  }, [volume, isMuted, isShuffle, repeatMode, playbackSpeed, selectedEqPreset, eqBands, storageReady, showToast]);

  const handleToggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await appRootRef.current?.requestFullscreen();
      }
    } catch (error) {
      console.error('Could not change fullscreen mode:', error);
      showToast('Fullscreen is not available in this window.');
    }
  };

  // ==========================================
  // INITIALIZE WEB AUDIO GRAPH (DSP & VISUALIZER)
  // ==========================================
  const initWebAudio = useCallback(() => {
    if (audioContextRef.current) return;
    const mediaEl = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current;
    if (!mediaEl) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // 5-band EQ filters
      const freqs = [60, 230, 910, 3600, 14000];
      const types: BiquadFilterType[] = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];
      const filters = freqs.map((f, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = types[i];
        filter.frequency.value = f;
        filter.gain.value = eqBands[i] || 0;
        return filter;
      });
      biquadFiltersRef.current = filters;

      // Connect source -> filter0 -> filter1 -> ... -> analyser -> destination
      const source = ctx.createMediaElementSource(mediaEl);
      sourceNodeRef.current = source;

      let prevNode: AudioNode = source;
      filters.forEach((flt) => {
        prevNode.connect(flt);
        prevNode = flt;
      });

      prevNode.connect(analyser);
      analyser.connect(ctx.destination);
    } catch (err) {
      console.warn('Web Audio Graph initialization note:', err);
    }
  }, [currentTrack.mediaType, eqBands]);

  useEffect(() => {
    const analyser = analyserRef.current;
    if (!isPlaying || isMuted || !analyser) {
      setAudioLevel(0);
      return;
    }

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const intervalId = window.setInterval(() => {
      analyser.getByteFrequencyData(frequencyData);
      const average = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length;
      setAudioLevel(Math.min(1, average / 255));
    }, 50);

    return () => {
      window.clearInterval(intervalId);
      setAudioLevel(0);
    };
  }, [isPlaying, isMuted, currentTrack.mediaType]);

  // Update EQ filters when eqBands change
  useEffect(() => {
    if (biquadFiltersRef.current.length > 0) {
      biquadFiltersRef.current.forEach((filter, idx) => {
        if (filter && eqBands[idx] !== undefined) {
          filter.gain.setValueAtTime(eqBands[idx], audioContextRef.current?.currentTime || 0);
        }
      });
    }
  }, [eqBands]);

  // ==========================================
  // SYNC ACTIVE MEDIA ELEMENT
  // ==========================================
  const activeMediaElement = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current;

  // Sync track src and playback
  useEffect(() => {
    const el = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current;
    if (!el) return;

    if (!currentTrack.mediaUrl) {
      el.pause();
      el.removeAttribute('src');
      el.load();
      if (isPlaying) setIsPlaying(false);
      return;
    }

    if (el.getAttribute('src') !== currentTrack.mediaUrl) {
      el.pause();
      el.src = currentTrack.mediaUrl;
      el.load();
    }

    if (isPlaying) {
      el.play().catch((error: unknown) => {
        console.error('Could not start playback:', error);
        setIsPlaying(false);
        showToast('Playback could not start. Check that the media file is still available.');
      });
    } else {
      el.pause();
    }
  }, [currentTrackIndex, currentTrack.mediaUrl, currentTrack.mediaType, isPlaying, showToast]);

  // Volume & Speed Sync
  useEffect(() => {
    const el = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current;
    if (el) {
      el.volume = isMuted ? 0 : volume / 100;
      el.muted = isMuted;
      el.playbackRate = playbackSpeed;
    }
  }, [volume, isMuted, playbackSpeed, currentTrack.mediaType]);

  // ==========================================
  // PLAYBACK CONTROL HANDLERS
  // ==========================================
  const handleTogglePlay = useCallback(() => {
    const el = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current;
    if (!el) return;
    if (!currentTrack.mediaUrl) {
      showToast('This track is still loading. Try again in a moment.');
      return;
    }

    // Resume AudioContext if suspended
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    } else if (!audioContextRef.current) {
      initWebAudio();
    }

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error('Could not start playback:', err);
          setIsPlaying(false);
          showToast('Playback could not start. Check that the media file is still available.');
        });
    }
  }, [currentTrack.mediaType, currentTrack.mediaUrl, isPlaying, initWebAudio, showToast]);

  const handleStop = useCallback(() => {
    const el = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current;
    el?.pause();
    if (el) el.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }, [currentTrack.mediaType]);

  const handlePlayTrack = useCallback((index: number) => {
    if (!tracks[index]) return;
    setActivePlaylistId(null);
    setPlaylistQueueIds([]);
    setCurrentTrackIndex(index);
    setCurrentTime(0);
    setIsPlaying(true);

    const targetTrack = tracks[index];
    if (targetTrack?.mediaType === 'video' && activeTab !== 'video-player') {
      setActiveTab('video-player');
    }
  }, [tracks, activeTab]);

  const handlePlayPlaylistTrack = (playlistId: string, trackId: string) => {
    const playlist = playlists.find((item) => item.id === playlistId);
    const index = tracks.findIndex((track) => track.id === trackId);
    if (!playlist || index < 0) return;
    setActivePlaylistId(playlist.id);
    setPlaylistQueueIds(playlist.trackIds);
    setCurrentTrackIndex(index);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleNextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    const queuedId = upNext.find(id => tracks.some(track => track.id === id));
    if (queuedId) {
      setUpNext(previous => previous.slice(previous.indexOf(queuedId) + 1));
      const index = tracks.findIndex(track => track.id === queuedId);
      const el = tracks[index].mediaType === 'video' ? videoRef.current : audioRef.current;
      if (index === currentTrackIndex && el) { el.currentTime = 0; void el.play().catch(() => setIsPlaying(false)); }
      setCurrentTrackIndex(index); setCurrentTime(0); setIsPlaying(true);
      if (tracks[index].mediaType === 'video') setActiveTab('video-player');
      return;
    }
    if (activePlaylistId && playlistQueueIds.length) {
      const currentId = tracks[currentTrackIndex]?.id;
      const currentQueueIndex = playlistQueueIds.indexOf(currentId);
      const nextQueueIndex = isShuffle
        ? Math.floor(Math.random() * playlistQueueIds.length)
        : currentQueueIndex < 0 ? 0 : (currentQueueIndex + 1) % playlistQueueIds.length;
      const nextTrackIndex = tracks.findIndex((track) => track.id === playlistQueueIds[nextQueueIndex]);
      if (nextTrackIndex >= 0) setCurrentTrackIndex(nextTrackIndex);
    } else {
      if (isShuffle) {
        setCurrentTrackIndex(Math.floor(Math.random() * tracks.length));
      } else {
        setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
      }
    }
    setCurrentTime(0);
    setIsPlaying(true);
  }, [activePlaylistId, currentTrackIndex, isShuffle, playlistQueueIds, tracks, upNext]);

  const handlePrevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    const el = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current;
    if (el && el.currentTime > 3) {
      el.currentTime = 0;
      setCurrentTime(0);
    } else if (activePlaylistId && playlistQueueIds.length) {
      const currentQueueIndex = playlistQueueIds.indexOf(tracks[currentTrackIndex]?.id);
      const previousQueueIndex = currentQueueIndex < 0
        ? playlistQueueIds.length - 1
        : (currentQueueIndex - 1 + playlistQueueIds.length) % playlistQueueIds.length;
      const previousTrackIndex = tracks.findIndex((track) => track.id === playlistQueueIds[previousQueueIndex]);
      if (previousTrackIndex >= 0) setCurrentTrackIndex(previousTrackIndex);
    } else {
      setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    }
    setCurrentTime(0);
    setIsPlaying(true);
  }, [activePlaylistId, currentTrack.mediaType, currentTrackIndex, playlistQueueIds, tracks]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = Number(e.target.value);
    setCurrentTime(seekTime);
    const el = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current;
    if (el) {
      el.currentTime = seekTime;
    }
  };

  const handleSeekRelative = useCallback((deltaSeconds: number) => {
    const el = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current;
    if (el) {
      const targetTime = Math.max(0, Math.min(el.duration || duration, el.currentTime + deltaSeconds));
      el.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  }, [currentTrack.mediaType, duration]);

  const handleVolumeRelative = useCallback((deltaPercent: number) => {
    setVolume((prev) => {
      const newVol = Math.max(0, Math.min(100, prev + deltaPercent));
      if (newVol > 0 && isMuted) setIsMuted(false);
      return newVol;
    });
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const toggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const handleToggleFavorite = (trackId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isFavorite: !t.isFavorite } : t))
    );
  };

  // ==========================================
  // LOCAL FILE LOADING (HTML5 FILE SYSTEM API)
  // ==========================================
  const handleImportFiles = async (files: File[], playlistName?: string) => {
    if (importing.current || !files.length) return;
    if (!storageReady) { showToast('Please wait for your saved library to load.'); return; }
    importing.current = true;
    setImportSummary('');
    setImportProgress({ done: 0, total: files.length });
    try {
      const known = new Set(tracks.flatMap(track => track.fileRef ? [fileIdentity(track.fileRef)] : []));
      const parsedTracks: Track[] = [];
      let duplicates = 0;
      let unsupported = 0;
      let failed = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const key = fileIdentity(file);
        if (!isMediaFile(file)) unsupported++;
        else if (known.has(key)) duplicates++;
        else {
          try {
            const trk = await parseFileToTrack(file, tracks.length + i);
            parsedTracks.push(trk);
            known.add(key);
          } catch { failed++; }
        }
        setImportProgress({ done: i + 1, total: files.length });
      }
      setImportSummary(`${parsedTracks.length} imported · ${duplicates} duplicates skipped · ${unsupported} unsupported · ${failed} unreadable. Duplicates match filename and size.`);
      if (!parsedTracks.length) return;
      setTracks((prev) => [...parsedTracks, ...prev]);
      setCurrentTrackIndex(0);
      setCurrentTime(0);
      setIsPlaying(true);
      if (playlistName) {
        const id = `playlist-${Date.now()}`;
        const importedTrackIds = parsedTracks.map((track) => track.id);
        setPlaylists((previous) => [{
          id,
          name: playlistName,
          trackCount: parsedTracks.length,
          trackIds: importedTrackIds,
          coverArt: parsedTracks[0]?.coverArt ?? '',
          accentColor: parsedTracks[0]?.accentColor ?? '#6366f1',
          description: `Imported from folder with ${parsedTracks.length} media files.`
        }, ...previous]);
        setActivePlaylistId(id);
        setPlaylistQueueIds(importedTrackIds);
        setSelectedSidebar(id);
        setActiveTab('playlists');
      } else {
        setActivePlaylistId(null);
        setPlaylistQueueIds([]);
      }

      const firstIsVideo = parsedTracks[0]?.mediaType === 'video';
      if (playlistName) {
        showToast(`Created playlist "${playlistName}" with ${parsedTracks.length} file(s)`);
      } else if (firstIsVideo) {
        setActiveTab('video-player');
        showToast(`Successfully imported ${parsedTracks.length} local file(s)`);
      } else {
        setActiveTab('now-playing');
        showToast(`Successfully imported ${parsedTracks.length} local file(s)`);
      }
    } catch (err) {
      console.error('Failed to import local files:', err);
      showToast('Could not import local files. Please try again.');
    } finally {
      importing.current = false;
      setImportProgress(null);
    }
  };

  const handleLoadLocalFiles = async () => {
    await handleImportFiles(await openLocalMediaFiles());
  };

  const handleImportFolderAsPlaylist = async () => {
    const files = await openLocalMediaFolder();
    if (!files.length) return;
    const relativePath = files[0].webkitRelativePath;
    const folderName = relativePath?.split('/')[0] || 'Imported Folder';
    await handleImportFiles(files, folderName);
  };

  const handleCreatePlaylist = (name: string, description: string, trackIds: string[]) => {
    const id = `playlist-${Date.now()}`;
    const firstTrack = tracks.find((track) => track.id === trackIds[0]);
    setPlaylists((previous) => [{
      id,
      name,
      description,
      trackIds,
      trackCount: trackIds.length,
      coverArt: firstTrack?.coverArt ?? '',
      accentColor: firstTrack?.accentColor ?? '#6366f1'
    }, ...previous]);
    setSelectedSidebar(id);
    showToast(`Created playlist "${name}"`);
  };

  const handleDeletePlaylist = (playlistId: string) => {
    setPlaylists((previous) => previous.filter((playlist) => playlist.id !== playlistId));
    if (activePlaylistId === playlistId) {
      setActivePlaylistId(null);
      setPlaylistQueueIds([]);
    }
    if (selectedSidebar === playlistId) setSelectedSidebar('playlists');
    showToast('Playlist deleted');
  };

  const handleRenamePlaylist = (playlistId: string, name: string) => {
    setPlaylists((previous) => previous.map((playlist) => playlist.id === playlistId ? { ...playlist, name } : playlist));
  };

  const handleUpdatePlaylistDescription = (playlistId: string, description: string) => {
    setPlaylists((previous) => previous.map((playlist) => playlist.id === playlistId ? { ...playlist, description } : playlist));
  };

  const handleAddPlaylistTracks = (playlistId: string, trackIds: string[]) => {
    if (!trackIds.length) return;
    const playlist = playlists.find((item) => item.id === playlistId);
    const nextQueueIds = playlist ? [...playlist.trackIds, ...trackIds.filter((id) => !playlist.trackIds.includes(id))] : [];
    setPlaylists((previous) => previous.map((playlist) => {
      if (playlist.id !== playlistId) return playlist;
      return { ...playlist, trackIds: nextQueueIds, trackCount: nextQueueIds.length };
    }));
    if (activePlaylistId === playlistId) setPlaylistQueueIds(nextQueueIds);
  };

  const handleRemovePlaylistTrack = (playlistId: string, trackId: string) => {
    const playlist = playlists.find((item) => item.id === playlistId);
    const nextQueueIds = playlist?.trackIds.filter((id) => id !== trackId) ?? [];
    setPlaylists((previous) => previous.map((playlist) => {
      if (playlist.id !== playlistId) return playlist;
      return { ...playlist, trackIds: nextQueueIds, trackCount: nextQueueIds.length };
    }));
    if (activePlaylistId === playlistId) setPlaylistQueueIds(nextQueueIds);
  };

  const handleMovePlaylistTrack = (playlistId: string, trackId: string, direction: -1 | 1) => {
    const playlist = playlists.find((item) => item.id === playlistId);
    if (!playlist) return;
    const currentIndex = playlist.trackIds.indexOf(trackId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= playlist.trackIds.length) return;
    const reorderedTrackIds = [...playlist.trackIds];
    [reorderedTrackIds[currentIndex], reorderedTrackIds[nextIndex]] = [reorderedTrackIds[nextIndex], reorderedTrackIds[currentIndex]];
    setPlaylists((previous) => previous.map((playlist) => {
      if (playlist.id !== playlistId) return playlist;
      return { ...playlist, trackIds: reorderedTrackIds };
    }));
    if (activePlaylistId === playlistId) setPlaylistQueueIds(reorderedTrackIds);
  };

  const handleCreateImageCollection = (name: string): string => {
    const id = `collection-${Date.now()}`;
    setImageCollections((previous) => [...previous, { id, name }]);
    return id;
  };

  const handleRenameImageCollection = (collectionId: string, name: string) => {
    setImageCollections((previous) => previous.map((collection) => collection.id === collectionId ? { ...collection, name } : collection));
  };

  const handleDeleteImageCollection = async (collectionId: string) => {
    const collectionImages = images.filter((image) => image.collectionId === collectionId);
    try {
      await Promise.all(collectionImages.map((image) => deleteImage(image.id)));
      collectionImages.forEach((image) => URL.revokeObjectURL(image.url));
      setImages((previous) => previous.filter((image) => image.collectionId !== collectionId));
      setImageCollections((previous) => previous.filter((collection) => collection.id !== collectionId));
    } catch (error) {
      console.error('Could not delete image collection:', error);
      showToast('Could not delete this collection. Please try again.');
    }
  };

  const handleUploadImages = async (collectionId: string, files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) showToast('Only image files can be added to a collection.');
    const addedImages: ImageAsset[] = [];
    try {
      for (const file of imageFiles) {
        const image: ImageAsset = {
          id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          collectionId,
          url: URL.createObjectURL(file)
        };
        try {
          await saveImage(image, file);
          addedImages.push(image);
        } catch (error) {
          URL.revokeObjectURL(image.url);
          throw error;
        }
      }
      setImages((previous) => [...previous, ...addedImages]);
      if (addedImages.length) showToast(`Added ${addedImages.length} image(s)`);
    } catch (error) {
      setImages((previous) => [...previous, ...addedImages]);
      console.error('Could not save images:', error);
      showToast(addedImages.length
        ? `Added ${addedImages.length} image(s), but could not save the rest.`
        : 'Could not save images. Browser storage may be full.');
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      await deleteImage(imageId);
      setImages((previous) => {
        const image = previous.find((item) => item.id === imageId);
        if (image) URL.revokeObjectURL(image.url);
        return previous.filter((item) => item.id !== imageId);
      });
    } catch (error) {
      console.error('Could not delete image:', error);
      showToast('Could not delete this image. Please try again.');
    }
  };

  // ==========================================
  // KEYBOARD SHORTCUTS
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeekRelative(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeekRelative(5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        handleVolumeRelative(5);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleVolumeRelative(-5);
      } else if (e.code === 'KeyN') {
        e.preventDefault();
        handleNextTrack();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        handlePrevTrack();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        if (activeTab === 'visualizer') {
          setActiveTab('now-playing');
        } else {
          setActiveTab('visualizer');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    handleTogglePlay,
    toggleMute,
    handleSeekRelative,
    handleVolumeRelative,
    handleNextTrack,
    handlePrevTrack,
    activeTab
  ]);

  // ==========================================
  // MEDIA ELEMENT EVENT LISTENERS
  // ==========================================
  const recordListening = (el: HTMLMediaElement) => {
    if (!currentTrack.id || pendingResume.current || el.getAttribute('src') !== currentTrack.mediaUrl) return;
    const entry = { id: currentTrack.id, position: el.ended ? 0 : el.currentTime, playedAt: Date.now() };
    setHistory(previous => [entry, ...previous.filter(item => item.id !== entry.id)]);
    void saveListeningEntry(entry).catch(() => showToast('Could not save your listening position.'));
  };

  const handleResume = (id: string, position: number) => {
    const index = tracks.findIndex(track => track.id === id);
    if (index < 0) return;
    const el = tracks[index].mediaType === 'video' ? videoRef.current : audioRef.current;
    const target = Number.isFinite(position) ? Math.max(0, position) : 0;
    pendingResume.current = { id, position: target };
    handlePlayTrack(index);
    if (el && el.getAttribute('src') === tracks[index].mediaUrl && el.readyState >= 1) {
      el.currentTime = target >= el.duration - 1 ? 0 : target;
      setCurrentTime(el.currentTime);
      pendingResume.current = null;
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    if (!isDraggingScrubber.current) setCurrentTime(e.currentTarget.currentTime);
    if (!e.currentTarget.paused && Date.now() - lastHistorySave.current > 2000) {
      lastHistorySave.current = Date.now();
      recordListening(e.currentTarget);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    if (pendingResume.current?.id === currentTrack.id) {
      const position = pendingResume.current.position;
      e.currentTarget.currentTime = position >= e.currentTarget.duration - 1 ? 0 : position;
      setCurrentTime(e.currentTarget.currentTime);
      pendingResume.current = null;
    }
    if (e.currentTarget.duration && !isNaN(e.currentTarget.duration)) {
      setDuration(Math.round(e.currentTarget.duration));
    }
  };

  const handleMediaEnded = () => {
    if (repeatMode === 'one') {
      const el = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current;
      if (el) {
        el.currentTime = 0;
        el.play().catch((error: unknown) => {
          console.error('Could not repeat the current track:', error);
          setIsPlaying(false);
          showToast('Playback could not continue. Check that the media file is still available.');
        });
      }
    } else if (repeatMode === 'all' || upNext.length > 0) {
      handleNextTrack();
    } else {
      const el = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current;
      if (el) el.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  // Filtered & Sorted Tracks for File Browser
  const filteredTracks = useMemo(() => {
    return tracks
      .filter((t) => {
        const matchesSearch =
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.album.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.format.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFormat = formatFilter === 'ALL' ? true : t.format === formatFilter;
        const matchesFavorites = selectedSidebar !== 'favorites' || t.isFavorite;
        return matchesSearch && matchesFormat && matchesFavorites;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'string') {
          return sortAsc
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        }
        return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      });
  }, [tracks, searchQuery, formatFilter, sortField, sortAsc, selectedSidebar]);

  const effectiveDuration = duration > 0 ? duration : currentTrack.duration || 1;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));
  useMediaSession(currentTrack, isPlaying, currentTime, effectiveDuration, playbackSpeed, {
    play: () => setIsPlaying(true), pause: () => setIsPlaying(false), next: handleNextTrack, previous: handlePrevTrack, stop: handleStop,
    seek: position => { const el = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current; if (el) { el.currentTime = Math.min(effectiveDuration, Math.max(0, position)); setCurrentTime(el.currentTime); } },
  });
  useEffect(() => {
    if (!sleepDeadline) return;
    const restoreVolume = () => { [audioRef.current, videoRef.current].forEach(el => { if (el) el.volume = isMuted ? 0 : volume / 100; }); };
    const tick = () => {
      const remaining = Math.max(0, sleepDeadline - Date.now());
      setSleepRemaining(Math.ceil(remaining / 1000));
      [audioRef.current, videoRef.current].forEach(el => { if (el) el.volume = (isMuted ? 0 : volume / 100) * Math.min(1, remaining / 10000); });
      if (!remaining) { audioRef.current?.pause(); videoRef.current?.pause(); setIsPlaying(false); setSleepDeadline(null); showToast('Sleep timer finished. Playback paused.'); }
    };
    tick(); const interval = window.setInterval(tick, 250);
    return () => { clearInterval(interval); restoreVolume(); };
  }, [sleepDeadline, volume, isMuted, showToast]);
  const renderPlaybackBar = (embedded = false, pullout = false) => (
    <PlaybackBar
      analyserNode={analyserRef.current}
      embedded={embedded}
      pullout={pullout}
      currentTime={currentTime}
      effectiveDuration={effectiveDuration}
      isMuted={isMuted}
      isPlaying={isPlaying}
      isQueueOpen={showQueueDrawer}
      isShuffle={isShuffle}
      onNextTrack={handleNextTrack}
      onOpenEqualizer={() => setShowEqualizerModal(true)}
      onOpenShortcuts={() => setShowShortcutsModal(true)}
      onPreviousTrack={handlePrevTrack}
      onSeek={handleSeek}
      onStop={handleStop}
      onSetPlaybackSpeed={setPlaybackSpeed}
      onSetVolume={(nextVolume) => {
        setVolume(nextVolume);
        if (isMuted) setIsMuted(false);
      }}
      onShowNowPlaying={() => {
        setSelectedSidebar('home');
        setActiveTab(currentTrack.mediaType === 'video' ? 'video-player' : 'now-playing');
      }}
      onShowVisualizer={() => {
        setSelectedSidebar('visualizer');
        setActiveTab('visualizer');
      }}
      onToggleFavorite={(trackId) => handleToggleFavorite(trackId)}
      onToggleFullscreen={handleToggleFullscreen}
      onToggleMute={toggleMute}
      onTogglePlay={handleTogglePlay}
      onToggleQueue={() => setShowQueueDrawer((open) => !open)}
      onToggleRepeat={toggleRepeat}
      onToggleShuffle={() => setIsShuffle((shuffle) => !shuffle)}
      onStartScrubbing={() => { isDraggingScrubber.current = true; }}
      onStopScrubbing={() => { isDraggingScrubber.current = false; }}
      playbackSpeed={playbackSpeed}
      progressPercent={progressPercent}
      repeatMode={repeatMode}
      track={currentTrack}
      volume={volume}
    />
  );

  return (
    <div
      ref={appRootRef}
      id="phoenix-media-player-root"
      onDragEnter={(event) => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); dragDepth.current++; setIsFileDrag(true); } }}
      onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
      onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setIsFileDrag(false); }}
      onDrop={(event) => {
        event.preventDefault(); dragDepth.current = 0; setIsFileDrag(false);
        if (importing.current) { showToast('An import is already in progress.'); return; }
        void collectDroppedFiles(event.dataTransfer.items, event.dataTransfer.files).then(files => handleImportFiles(files)).catch(() => showToast('Could not read the dropped folder. Try Open folder instead.'));
      }}
      className="relative flex h-[100dvh] w-screen flex-col overflow-hidden bg-zinc-950 font-sans text-zinc-100 shadow-2xl select-none"
    >
      {isFileDrag && <div className="pointer-events-none absolute inset-3 z-[80] flex items-center justify-center rounded-2xl border-2 border-dashed border-amber-200 bg-zinc-950/95 p-8 text-center text-xl text-amber-200">Drop files or folders to add to your library</div>}
      {(importProgress || importSummary) && <div role="status" className="z-40 flex shrink-0 items-center gap-3 border-b border-amber-200/15 bg-zinc-900 px-4 py-3 text-xs text-amber-100">
        <div className="flex-1">{importProgress ? <><p>Importing {importProgress.done} of {importProgress.total} files…</p><progress className="mt-2 h-1 w-full accent-amber-200" value={importProgress.done} max={importProgress.total} /></> : importSummary}</div>
        {!importProgress && <button aria-label="Dismiss import summary" onClick={() => setImportSummary('')} className="p-3"><X className="h-4 w-4" /></button>}
      </div>}
      {/* =========================================================
          HIDDEN REAL HTML5 MEDIA ENGINES (<audio> & <video>)
          ========================================================= */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleMediaEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={(event) => { setIsPlaying(false); recordListening(event.currentTarget); }}
        className="hidden"
        preload="auto"
      />

      {/* Hidden fallback video element if not on video-player tab */}
      {activeTab !== 'video-player' && (
        <video
          ref={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleMediaEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={(event) => { setIsPlaying(false); recordListening(event.currentTarget); }}
          className="hidden"
          preload="auto"
          playsInline
        />
      )}

      {/* =========================================================
          DYNAMIC ATMOSPHERIC RADIAL GLOW & BACKGROUND
          ========================================================= */}
      <div
        className="pointer-events-none absolute -top-40 left-1/3 w-[850px] h-[750px] rounded-full blur-[140px] opacity-35 transition-all duration-1000 ease-out"
        style={{
          background: `radial-gradient(circle, ${currentTrack.accentColor} 0%, transparent 70%)`
        }}
      />
      <div
        className="pointer-events-none absolute bottom-10 right-10 w-[600px] h-[550px] rounded-full blur-[160px] opacity-20 transition-all duration-1000 ease-out"
        style={{
          background: `radial-gradient(circle, ${currentTrack.accentColor} 0%, transparent 65%)`
        }}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div role="status" className="absolute top-14 left-1/2 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 z-50 bg-zinc-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-medium border border-white/15">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================
          CUSTOM TITLE BAR (WINDOWS MEDIA PLAYER IMMERSIVE THEME)
          ========================================================= */}
      <header
        id="title-bar"
        className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-3 backdrop-blur-xl select-none sm:px-4"
        style={{ backgroundColor: 'rgba(18, 18, 18, 0.6)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            className="rounded-lg p-2 text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white md:hidden"
            onClick={() => setIsMobileNavOpen(true)}
            title="Open navigation"
            aria-label="Open navigation"
            aria-expanded={isMobileNavOpen}
            aria-controls="sidebar-navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleLogoHome}
            className="flex min-w-0 items-center gap-2 rounded-lg text-left transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300 sm:gap-3"
            title="Go to home"
            aria-label="Go to Phoenix Media Player home"
          >
            <MagneticLogo audioLevel={audioLevel} size={28} className="rounded-lg" />
            <span className="truncate text-xs font-semibold tracking-wide text-zinc-300 sm:text-sm">
              Phoenix Media Player
            </span>
          </button>
        </div>

        {/* Drag Region with live play state */}
        <div className="drag-region hidden h-full flex-1 cursor-default items-center justify-center px-4 sm:flex">
          {isPlaying ? (
            <div className="flex items-center gap-2 text-xs text-zinc-300 bg-white/5 px-3.5 py-0.5 rounded-full border border-white/10 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-zinc-100 uppercase tracking-wide truncate max-w-[200px]">
                {currentTrack.title}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400 truncate max-w-[150px]">{currentTrack.artist}</span>
              <span className="text-indigo-400 text-[10px] font-mono font-bold bg-indigo-500/20 px-1.5 py-0.2 rounded">
                {currentTrack.format}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
              <HardDrive className="w-3 h-3 text-indigo-400" />
              Ready for Local & Lossless Hi-Res Playback
            </span>
          )}
        </div>

        <div className="w-9 shrink-0" aria-hidden="true" />
      </header>

      {/* =========================================================
          MAIN BODY: SIDEBAR + CONTENT CANVAS
          ========================================================= */}
      <div className="relative flex-1 flex overflow-hidden">
        <AppSidebar
          activeTab={activeTab}
          audioLevel={audioLevel}
          currentTrackIsVideo={currentTrack.mediaType === 'video'}
          isMobileNavOpen={isMobileNavOpen}
          onCloseMobileNav={() => setIsMobileNavOpen(false)}
          onOpenEqualizer={() => setShowEqualizerModal(true)}
          onSearch={handleNavigateToSearch}
          playlists={playlists}
          selectedSidebar={selectedSidebar}
          setActiveTab={setActiveTab}
          setSelectedSidebar={setSelectedSidebar}
          tracks={tracks}
        />

        {/* ==========================================
            CENTER MAIN CANVAS (IMMERSIVE THEME)
            ========================================== */}
        <main className="player-canvas relative flex min-w-0 flex-1 flex-col overflow-y-auto bg-[#111212]">
          {/* Radial ambient background highlight */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(251,191,36,0.035),transparent_50%)] pointer-events-none" />

          <PlayerHeader
            activeTab={activeTab}
            selectedSidebar={selectedSidebar}
            isLyricsOpen={showLyricsPanel}
            onImportFiles={handleLoadLocalFiles}
            onToggleLyrics={() => setShowLyricsPanel((open) => !open)}
            searchInputRef={searchInputRef}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearchFocus={handleSearchFocus}
          />

          {activeTab === 'now-playing' && selectedSidebar === 'home' && <ContinueListening tracks={tracks} history={history} onResume={handleResume} />}
          {activeTab === 'now-playing' && selectedSidebar === 'home' && (
            <ListeningHome
              trackCount={tracks.length}
              playlistCount={playlists.length}
              activeMode={activePlayerMode}
              onImport={handleLoadLocalFiles}
              onImportFolder={handleImportFolderAsPlaylist}
              onPlaylists={() => { setSelectedSidebar('playlists'); setActiveTab('playlists'); }}
              onNavigate={(destination) => {
                setActivePlayerMode(destination);
                if (destination === 'equalizer') { setShowEqualizerModal(true); return; }
                setSelectedSidebar(destination === 'local-files' ? 'tracks' : destination);
                setActiveTab(destination === 'local-files' ? 'file-browser' : destination === 'youtube' ? 'youtube' : 'now-playing');
              }}
            />
          )}

          {/* TAB 1: NOW PLAYING (IMMERSIVE SHOWCASE HERO) */}
          {activeTab === 'now-playing' && selectedSidebar === 'home' && tracks.length > 0 && currentTrack.mediaType !== 'video' && (
            <div className="relative z-10 flex w-full flex-col px-6 py-6 animate-fadeIn lg:px-12 xl:px-16">
              <div className="mb-4 flex items-center justify-center gap-2">
                <button
                  id="btn-hero-favorite"
                  onClick={(e) => handleToggleFavorite(currentTrack.id, e)}
                  className="p-3 rounded-full bg-white/[0.055] hover:bg-white/10 text-zinc-300 border border-white/[0.08] transition-colors cursor-pointer"
                  title={currentTrack.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  aria-label={currentTrack.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg width="18" height="18" fill={currentTrack.isFavorite ? '#f43f5e' : 'none'} stroke={currentTrack.isFavorite ? '#f43f5e' : 'currentColor'} strokeWidth="2">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                </button>
                <button
                  id="btn-hero-equalizer"
                  onClick={() => setShowEqualizerModal(true)}
                  className="p-3 rounded-full bg-white/[0.055] hover:bg-white/10 text-zinc-300 border border-white/[0.08] transition-colors cursor-pointer"
                  title="Equalizer DSP"
                  aria-label="Equalizer DSP"
                >
                  <Sliders className="w-[18px] h-[18px] text-indigo-400" />
                </button>
              </div>
              <section className="flex flex-col items-center justify-center gap-8 lg:flex-row xl:gap-14">
                {/* Left: Album Artwork with Glow & Playback badge */}
                <div className="relative group flex-shrink-0">
                  <div
                    className="absolute -inset-8 rounded-[2rem] blur-3xl opacity-35 group-hover:opacity-60 transition-opacity"
                    style={{ backgroundColor: currentTrack.accentColor }}
                  />

                  <div className="w-64 h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80 rounded-2xl relative z-10 shadow-[0_28px_80px_rgba(0,0,0,0.55)] flex items-center justify-center overflow-hidden border border-white/10 bg-zinc-900">
                    <img
                      src={currentTrack.coverArt}
                      alt={currentTrack.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-black/10" />

                    {/* Centered glass playback badge */}
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="group/badge absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
                      aria-label={isPlaying ? 'Pause playback' : 'Play playback'}
                      title={isPlaying ? 'Pause playback' : 'Play playback'}
                    >
                      <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/10 rounded-full border border-white/20 backdrop-blur-md flex items-center justify-center shadow-lg group-hover/badge:scale-110 group-hover/badge:bg-white/20 transition-all">
                        {isPlaying ? (
                          <svg width="36" height="36" fill="white" viewBox="0 0 24 24">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                          </svg>
                        ) : (
                          <Play className="w-8 h-8 text-white fill-white ml-1" />
                        )}
                      </div>
                      <p className="text-[11px] font-bold tracking-widest text-white/70 uppercase group-hover/badge:text-white">
                        {isPlaying ? 'Playback Active' : 'Click to Play'}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Right: Track Detail & Typography */}
                <div className="flex flex-col gap-4 max-w-lg w-full">
                  <div className="space-y-1">
                    <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight leading-tight text-white">
                      {currentTrack.title}
                    </h1>
                    <p className="text-xl text-zinc-300/80 font-medium">
                      {currentTrack.artist}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-2.5 py-1 bg-white/[0.06] text-zinc-300 border border-white/[0.08] rounded-full text-[10px] font-semibold uppercase tracking-wider">
                      {currentTrack.format} {currentTrack.isLocal ? 'Local File' : 'Hi-Res Lossless'}
                    </span>
                    <span className="text-zinc-500 text-xs">
                      {currentTrack.year} • {currentTrack.genre}
                    </span>
                  </div>

                  <p className="text-zinc-400/90 text-sm leading-relaxed mt-1">
                    {currentTrack.synopsis || `From the album '${currentTrack.album}'. Playing via HTML5 audio engine.`}
                  </p>

                  {/* Audio Specs & Live Mini Visualizer Row */}
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-1 flex-wrap">
                    <span className="bg-white/[0.045] px-2.5 py-1 rounded-full border border-white/[0.07] text-zinc-300/90">
                      {currentTrack.sampleRate}
                    </span>
                    <span className="bg-white/[0.045] px-2.5 py-1 rounded-full border border-white/[0.07] text-zinc-300/90">
                      {currentTrack.bitrate}
                    </span>
                    <span className="bg-white/[0.045] px-2.5 py-1 rounded-full border border-white/[0.07] text-zinc-400">
                      {currentTrack.fileSize}
                    </span>
                    <div
                      onClick={() => setActiveTab('visualizer')}
                      className="cursor-pointer bg-white/[0.045] px-2.5 py-1 rounded-full border border-white/[0.07] hover:border-indigo-300/30 flex items-center gap-1.5 transition-all"
                      title="Click to view full DSP Visualizer"
                    >
                      <MiniVisualizer
                        isPlaying={isPlaying}
                        accentColor={currentTrack.accentColor}
                        analyserNode={analyserRef.current}
                        bars={10}
                        className="w-14 h-4"
                      />
                    </div>
                  </div>

                </div>
              </section>

              {/* Synced Lyrics Drawer (Collapsible) */}
              {showLyricsPanel && currentTrack.lyrics && (
                <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md transition-all my-4 max-w-2xl mx-auto w-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Mic2 className="w-4 h-4 text-indigo-400" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                        Synchronized Studio Lyrics & Metadata
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">Lossless Tag 2.4</span>
                  </div>
                  <div className="space-y-2 text-center py-2">
                    {currentTrack.lyrics.map((line, idx) => (
                      <p
                        key={idx}
                        className={`text-sm transition-all duration-300 ${
                          idx === 1 && isPlaying
                            ? 'text-indigo-300 font-semibold scale-105 py-1'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}


          {/* VIDEO PLAYER VIEW */}
          {(activeTab === 'video-player' || currentTrack.mediaType === 'video') && activeTab !== 'file-browser' && activeTab !== 'visualizer' && activeTab !== 'albums' && activeTab !== 'playlists' && activeTab !== 'spotify' && activeTab !== 'images' && selectedSidebar !== 'spotify' && (
            <VideoPlayerView
              track={currentTrack}
              videoRef={videoRef}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onToggleFullscreen={() => {
                if (videoRef.current?.requestFullscreen) {
                  videoRef.current.requestFullscreen();
                }
              }}
              isMuted={isMuted}
              onToggleMute={toggleMute}
            />
          )}
          {/* TAB 2: FILE BROWSER (IMMERSIVE EXPLORER) */}
          {activeTab === 'file-browser' && (
            <div className="flex flex-1 flex-col space-y-4 overflow-y-auto p-4 animate-fadeIn sm:space-y-5 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.035] p-4 rounded-2xl border border-white/[0.06] backdrop-blur-xl">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Your Library</span>
                  <ChevronRight className="w-3 h-3 text-zinc-600" />
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Media Library ({tracks.length} Files)</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Filter chips */}
                  <div className="flex items-center gap-1.5">
                    {['ALL', 'FLAC', 'WAV', 'MP3', 'MP4'].map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setFormatFilter(fmt)}
                        className={`px-3 py-1 rounded-full text-[11px] font-mono font-medium transition-all ${
                          formatFilter === fmt
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025]">
                <div className="min-w-0 flex-1 overflow-auto">
                  <div className="min-w-[620px]">
                <div className="grid grid-cols-12 gap-3 border-b border-white/[0.06] bg-white/[0.025] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <div className="col-span-1 text-center">#</div>
                  <div
                    className="col-span-4 flex items-center gap-1 cursor-pointer hover:text-white"
                    onClick={() => {
                      setSortField('title');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <span>Title</span>
                    {sortField === 'title' && <ArrowUpDown className="w-3 h-3 text-indigo-400" />}
                  </div>
                  <div
                    className="col-span-3 flex items-center gap-1 cursor-pointer hover:text-white"
                    onClick={() => {
                      setSortField('artist');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <span>Artist & Album</span>
                    {sortField === 'artist' && <ArrowUpDown className="w-3 h-3 text-indigo-400" />}
                  </div>
                  <div className="col-span-2 hidden md:flex items-center">Format / Size</div>
                  <div
                    className="col-span-2 flex items-center justify-end gap-1 cursor-pointer hover:text-white"
                    onClick={() => {
                      setSortField('duration');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <span>Duration</span>
                    {sortField === 'duration' && <ArrowUpDown className="w-3 h-3 text-indigo-400" />}
                  </div>
                </div>

                <div className="max-h-[480px] divide-y divide-white/[0.03] overflow-y-auto">
                  {filteredTracks.map((track, idx) => {
                    const isCurrent = tracks[currentTrackIndex]?.id === track.id;
                    const originalIndex = tracks.findIndex((t) => t.id === track.id);

                    return (
                      <div
                        key={track.id}
                        onClick={() => handlePlayTrack(originalIndex)}
                        className={`grid grid-cols-12 gap-3 px-5 py-3 items-center text-xs transition-all cursor-pointer group ${
                          isCurrent
                            ? 'bg-indigo-500/15 text-white font-medium'
                            : 'hover:bg-white/[0.04] text-zinc-300'
                        }`}
                      >
                        <div className="col-span-1 flex items-center justify-center">
                          {isCurrent && isPlaying ? (
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                          ) : (
                            <span className="group-hover:hidden font-mono text-zinc-500">
                              {idx + 1}
                            </span>
                          )}
                          <Play className="w-3.5 h-3.5 text-white hidden group-hover:block fill-white" />
                        </div>

                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                          <img
                            src={track.coverArt}
                            alt={track.title}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`truncate font-semibold ${isCurrent ? 'text-indigo-400' : 'text-zinc-100'}`}>
                                {track.title}
                              </p>
                              {track.mediaType === 'video' && (
                                <Film className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate">{track.path}</p>
                          </div>
                        </div>

                        <div className="col-span-3 min-w-0">
                          <p className="truncate text-zinc-300">{track.artist}</p>
                          <p className="text-[11px] text-zinc-500 truncate">{track.album}</p>
                        </div>

                        <div className="col-span-2 hidden md:flex items-center gap-2 font-mono text-[11px]">
                          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-bold">
                            {track.format}
                          </span>
                          <span className="text-zinc-400 truncate">{track.fileSize}</span>
                        </div>

                        <div className="col-span-2 flex items-center justify-end gap-3 font-mono text-zinc-400">
                          <span>{formatTime(track.duration)}</span>
                          <button
                            onClick={(e) => handleToggleFavorite(track.id, e)}
                            className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                track.isFavorite
                                  ? 'text-rose-500 fill-rose-500'
                                  : 'text-zinc-500'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VISUALIZER (FULL SPECTRUM DSP) */}
          {activeTab === 'visualizer' && (
            <AudioVisualizer
              isPlaying={isPlaying}
              accentColor={currentTrack.accentColor}
              analyserNode={analyserRef.current}
              audioDevice={audioDevice}
              selectedPreset={selectedEqPreset}
            />
          )}

          {/* TAB 4: ALBUMS */}
          {activeTab === 'albums' && (
            <div className="flex-1 space-y-6 overflow-y-auto p-4 animate-fadeIn sm:p-6 lg:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                    Master Albums & Collections
                  </h2>
                  <p className="text-xs text-zinc-400">Lossless Studio Masters</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {albums.map((alb) => (
                  <div
                    key={alb.id}
                    onClick={() => {
                      const firstTrackIndex = tracks.findIndex((track) => track.id === alb.trackIds[0]);
                      if (firstTrackIndex >= 0) handlePlayTrack(firstTrackIndex);
                    }}
                    className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-indigo-500/40 transition-all cursor-pointer group flex flex-col gap-3"
                  >
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-800 relative">
                      <img
                        src={alb.coverArt}
                        alt={alb.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                          <Play className="w-6 h-6 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-zinc-100 truncate">{alb.title}</h3>
                      <p className="text-xs text-zinc-400">{alb.artist}</p>
                      <p className="text-[10px] font-mono text-zinc-500 mt-1">
                        {alb.year || 'Year unknown'} • {alb.trackIds.length} Tracks
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {albums.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
                  No albums yet. Import music to see your albums here.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PLAYLISTS */}
          {activeTab === 'playlists' && (
            <PlaylistsView
              onCreate={handleCreatePlaylist}
              onDelete={handleDeletePlaylist}
              onImportFolder={handleImportFolderAsPlaylist}
              onMoveTrack={handleMovePlaylistTrack}
              onPlayTrack={(trackId) => {
                const playlist = playlists.find((item) => item.id === selectedSidebar);
                if (playlist) {
                  handlePlayPlaylistTrack(playlist.id, trackId);
                } else {
                  const index = tracks.findIndex((track) => track.id === trackId);
                  if (index >= 0) handlePlayTrack(index);
                }
              }}
              onRemoveTrack={handleRemovePlaylistTrack}
              onRename={handleRenamePlaylist}
              onUpdateDescription={handleUpdatePlaylistDescription}
              onSelect={setSelectedSidebar}
              onAddTracks={handleAddPlaylistTracks}
              playlists={playlists}
              selectedPlaylistId={playlists.some((playlist) => playlist.id === selectedSidebar) ? selectedSidebar : null}
              tracks={tracks}
            />
          )}

          {activeTab === 'now-playing' && selectedSidebar === 'spotify' && (
            <SpotifyView />
          )}

          {activeTab === 'youtube' && (
            <section className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center animate-fadeIn">
              <div className="max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.035] p-8 shadow-2xl">
                <h2 className="text-xl font-semibold text-white">YouTube</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Open YouTube to browse music and videos. Phoenix playback controls remain available while you explore.
                </p>
                <a
                  href="https://www.youtube.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-400"
                >
                  Open YouTube
                </a>
              </div>
            </section>
          )}

          {activeTab === 'images' && (
            <ImagesView
              collections={imageCollections}
              images={images}
              onCreateCollection={handleCreateImageCollection}
              onDeleteCollection={handleDeleteImageCollection}
              onDeleteImage={handleDeleteImage}
              onRenameCollection={handleRenameImageCollection}
              onUploadImages={handleUploadImages}
            />
          )}
        </main>

        {/* ==========================================
            RIGHT QUEUE DRAWER (SLIDE OVER)
            ========================================== */}
        {showQueueDrawer && <QueuePanel tracks={tracks} queue={upNext.filter(id => tracks.some(track => track.id === id))} onChange={setUpNext} onClose={() => setShowQueueDrawer(false)} />}
      </div>

      {tracks.length > 0 && <div className="flex shrink-0 items-center justify-between border-t border-white/10 bg-zinc-950 px-4 text-xs">
        <button className="min-h-11 text-amber-200" onClick={() => setShowQueueDrawer(open => !open)} aria-expanded={showQueueDrawer}>Up next ({upNext.length})</button>
        <label className="flex items-center gap-2 text-zinc-400">{sleepDeadline ? `Sleep · ${formatTime(sleepRemaining)}` : 'Sleep timer'}<select aria-label="Sleep timer" value={sleepDeadline ? 'active' : 'off'} onChange={event => { const minutes = Number(event.target.value); setSleepRemaining(minutes * 60); setSleepDeadline(minutes ? Date.now() + minutes * 60000 : null); }} className="min-h-11 max-w-32 bg-zinc-950 px-2 text-zinc-200">
          <option value="off">Off</option>{sleepDeadline && <option value="active" disabled>Timer active</option>}{[1, 15, 30, 45, 60].map(minutes => <option key={minutes} value={minutes}>{minutes} min</option>)}
        </select></label>
      </div>}
      {tracks.length > 0 && renderPlaybackBar()}

      {/* =========================================================
          MODALS: EQUALIZER DSP & KEYBOARD SHORTCUTS
          ========================================================= */}
      <EqualizerModal
        isOpen={showEqualizerModal}
        onClose={() => setShowEqualizerModal(false)}
        presets={EQUALIZER_PRESETS}
        selectedPreset={selectedEqPreset}
        onSelectPreset={(presetName) => {
          setSelectedEqPreset(presetName);
          const found = EQUALIZER_PRESETS.find((p) => p.name === presetName);
          if (found) {
            setEqBands([...found.bands]);
          }
        }}
        eqBands={eqBands}
        onBandChange={(idx, val) => {
          setEqBands((prev) => {
            const next = [...prev];
            next[idx] = val;
            return next;
          });
          setSelectedEqPreset('Custom');
        }}
        onReset={() => {
          setSelectedEqPreset('Flat');
          setEqBands([0, 0, 0, 0, 0]);
        }}
      />

      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
