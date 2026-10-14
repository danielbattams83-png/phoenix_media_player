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
  AlertCircle
} from 'lucide-react';
import { Track, Playlist, Album, EqualizerPreset, PlayerView } from './types';
import { openLocalMediaFiles, parseFileToTrack, formatBytes } from './utils/filePicker';
import { generateSynthesizedTrackBlob } from './utils/audioSynth';
import { EqualizerModal } from './components/EqualizerModal';
import { AppSidebar } from './components/AppSidebar';
import { PlayerHeader } from './components/PlayerHeader';
import { AudioVisualizer } from './components/AudioVisualizer';
import { MiniVisualizer } from './components/MiniVisualizer';
import { PlaybackBar } from './components/PlaybackBar';
import { VideoPlayerView } from './components/VideoPlayerView';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

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
// INITIAL MOCK TRACKS WITH SYNTH FALLBACKS
// ==========================================

const INITIAL_TRACKS: Track[] = [
  {
    id: 'track-1',
    title: 'STARDUST',
    artist: 'Neon Electric',
    album: 'Event Horizon',
    duration: 30,
    genre: 'Electronica / Synthwave',
    year: 2025,
    format: 'FLAC',
    bitrate: '2840 kbps',
    sampleRate: '96.0 kHz / 24-bit',
    fileSize: '86.4 MB',
    path: 'C:\\Lossless\\Event Horizon\\01 - Stardust.flac',
    coverArt: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
    accentColor: '#6366f1',
    glowRgba: 'rgba(99, 102, 241, 0.45)',
    isFavorite: true,
    mediaType: 'audio',
    synopsis: "From the studio album 'Event Horizon'. A masterful blend of analog synthesis and modern rhythmic pulses.",
    lyrics: [
      'Neon waves cascading through the silent grid',
      'Reflections of a world we never hid',
      'Catching frequencies in the midnight air',
      'Zero gravity, leaving shadows there',
      'Floating on the edge of sound and light',
      'Infinite resonance through the night'
    ]
  },
  {
    id: 'track-2',
    title: 'SOLARIS LUMINESCENCE',
    artist: 'Kroma Soundworks',
    album: 'Prismatic Echoes',
    duration: 30,
    genre: 'Electronic / Chill',
    year: 2024,
    format: 'FLAC',
    bitrate: '2304 kbps',
    sampleRate: '88.2 kHz / 24-bit',
    fileSize: '62.1 MB',
    path: 'C:\\Lossless\\Prismatic Echoes\\02 - Solaris Luminescence.flac',
    coverArt: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop',
    accentColor: '#ec4899',
    glowRgba: 'rgba(236, 72, 153, 0.45)',
    isFavorite: false,
    mediaType: 'audio',
    synopsis: 'Ethereal ambient pads layered with warm analog synth leads and spatial reverberation.',
    lyrics: [
      'Particles of sunlight breaking in',
      'Where the timeless orbits first begin',
      'Pulsing slowly in the solar wind',
      'A golden journey with no end'
    ]
  },
  {
    id: 'track-3',
    title: 'OBSIDIAN VELVET',
    artist: 'Marcus Sterling Quartet',
    album: 'Midnight Sessions at Blue Note',
    duration: 30,
    genre: 'Contemporary Jazz',
    year: 2023,
    format: 'WAV',
    bitrate: '4608 kbps',
    sampleRate: '192.0 kHz / 24-bit',
    fileSize: '188.5 MB',
    path: 'C:\\Lossless\\Blue Note Sessions\\03 - Obsidian Velvet.wav',
    coverArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
    accentColor: '#f59e0b',
    glowRgba: 'rgba(245, 158, 11, 0.45)',
    isFavorite: true,
    mediaType: 'audio',
    synopsis: 'Live acoustic jazz captured in uncompressed 192kHz multi-track master quality.',
    lyrics: [
      '[Instrumental Solo - Double Bass & Muted Trumpet]',
      '[Tenor Saxophone Cadenza]',
      '[Brushed Snare & Rhodes Improvisation]'
    ]
  },
  {
    id: 'track-4',
    title: 'CASCADIA RAIN',
    artist: 'Elena Rostova',
    album: 'Modern Classical Elements',
    duration: 30,
    genre: 'Neoclassical / Piano',
    year: 2025,
    format: 'FLAC',
    bitrate: '1820 kbps',
    sampleRate: '48.0 kHz / 24-bit',
    fileSize: '41.8 MB',
    path: 'C:\\Neoclassical\\04 - Cascadia Rain.flac',
    coverArt: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=800&auto=format&fit=crop',
    accentColor: '#06b6d4',
    glowRgba: 'rgba(6, 182, 212, 0.45)',
    isFavorite: false,
    mediaType: 'audio',
    synopsis: 'Intimate felt piano with binaural room mics recording gentle rainfall.',
    lyrics: [
      'Drops tapping against acoustic wood',
      'Quiet memories understood',
      'Sustain pedal holding on to grace',
      'Time stands still in this gentle space'
    ]
  },
  {
    id: 'track-5',
    title: 'CYBERPUNK DRIVE',
    artist: 'Vektor 99 & Glitch Matrix',
    album: 'Neo Tokyo Expressway',
    duration: 30,
    genre: 'Darksynth / Cyberpunk',
    year: 2026,
    format: 'MP3',
    bitrate: '320 kbps',
    sampleRate: '44.1 kHz / 16-bit',
    fileSize: '11.3 MB',
    path: 'C:\\Synthwave\\Neo Tokyo\\05 - Cyberpunk Drive.mp3',
    coverArt: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
    accentColor: '#10b981',
    glowRgba: 'rgba(16, 185, 129, 0.45)',
    isFavorite: true,
    mediaType: 'audio',
    synopsis: 'High-octane synth basslines with distorted drum machines and neon-drenched melodies.',
    lyrics: [
      'Turbos spooling in the rain-slick street',
      'Holographic adverts at our feet',
      'Pushing past the limiter tonight',
      'High-speed chase in crimson light'
    ]
  },
  {
    id: 'track-6',
    title: 'DEEP ABYSS RESONANCE',
    artist: 'Nautilus Deep Sea Project',
    album: 'Oceanic Frequencies',
    duration: 30,
    genre: 'Deep Ambient / Drone',
    year: 2024,
    format: 'FLAC',
    bitrate: '2110 kbps',
    sampleRate: '96.0 kHz / 24-bit',
    fileSize: '79.2 MB',
    path: 'C:\\Lossless\\Oceanic Frequencies\\06 - Deep Abyss.flac',
    coverArt: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=800&auto=format&fit=crop',
    accentColor: '#8b5cf6',
    glowRgba: 'rgba(139, 92, 246, 0.45)',
    isFavorite: false,
    mediaType: 'audio',
    synopsis: 'Ultra-low frequency acoustic drones modeled from ocean depths.',
    lyrics: [
      'Sub-bass waves 4000 meters low',
      'Bioluminescent blue-green glow',
      'Pressure rising, silence everywhere',
      'Submerging deep beyond all care'
    ]
  }
];

const MOCK_PLAYLISTS: Playlist[] = [
  {
    id: 'pl-1',
    name: 'Synthwave After-Hours',
    trackCount: 24,
    coverArt: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop',
    accentColor: '#6366f1',
    description: 'Analog synthesizer leads, arpeggiated basslines, and retro midnight vibes.'
  },
  {
    id: 'pl-2',
    name: 'Deep Focus Mix',
    trackCount: 32,
    coverArt: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=600&auto=format&fit=crop',
    accentColor: '#10b981',
    description: 'Binaural ambient, minimal neoclassical piano, and gentle frequencies.'
  },
  {
    id: 'pl-3',
    name: 'Underground Radio',
    trackCount: 18,
    coverArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop',
    accentColor: '#f59e0b',
    description: 'High-resolution lossless masters, live acoustic jazz, and vinyl cuts.'
  }
];

const MOCK_ALBUMS: Album[] = [
  {
    id: 'alb-1',
    title: 'Event Horizon',
    artist: 'Neon Electric',
    year: 2025,
    trackCount: 10,
    coverArt: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'alb-2',
    title: 'Prismatic Echoes',
    artist: 'Kroma Soundworks',
    year: 2024,
    trackCount: 8,
    coverArt: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'alb-3',
    title: 'Midnight Sessions at Blue Note',
    artist: 'Marcus Sterling Quartet',
    year: 2023,
    trackCount: 6,
    coverArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop'
  }
];

const EQUALIZER_PRESETS: EqualizerPreset[] = [
  { name: 'Flat', bands: [0, 0, 0, 0, 0] },
  { name: 'Bass Boost', bands: [6, 4, 1, 0, 0] },
  { name: 'Acoustic', bands: [2, 1, 3, 4, 3] },
  { name: 'Electronic', bands: [5, 3, 0, 3, 5] },
  { name: 'Vocal / Clarity', bands: [-2, 1, 4, 3, 1] },
  { name: 'Spatial Immersive', bands: [3, 2, -1, 3, 4] }
];

export default function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<PlayerView>('now-playing');
  const [selectedSidebar, setSelectedSidebar] = useState<string>('home');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [showQueueDrawer, setShowQueueDrawer] = useState<boolean>(false);
  const [showLyricsPanel, setShowLyricsPanel] = useState<boolean>(false);
  const [showEqualizerModal, setShowEqualizerModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'title' | 'artist' | 'duration' | 'bitrate'>('title');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Playback Engine State
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(30);
  const [volume, setVolume] = useState<number>(75);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('all');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [audioDevice] = useState<string>('Lossless Direct ASIO • 24-bit / 96kHz');
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

  const currentTrack = tracks[currentTrackIndex] || tracks[0];

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
  // INITIALIZE SYNTHETIC AUDIO FOR DEFAULT TRACKS
  // ==========================================
  useEffect(() => {
    let isMounted = true;
    const loadDefaultSynthSounds = async () => {
      const styles: Array<'synthwave' | 'ambient' | 'jazz' | 'piano' | 'cyberpunk' | 'drone'> = [
        'synthwave',
        'ambient',
        'jazz',
        'piano',
        'cyberpunk',
        'drone'
      ];
      try {
        const updated = await Promise.all(
          INITIAL_TRACKS.map(async (trk, idx) => {
            const blobUrl = await generateSynthesizedTrackBlob(styles[idx % styles.length], 45);
            return {
              ...trk,
              mediaUrl: blobUrl,
              duration: 45
            };
          })
        );
        if (isMounted) {
          setTracks(updated);
        }
      } catch (err) {
        console.warn('Synth sound generator notice:', err);
      }
    };
    loadDefaultSynthSounds();
    return () => {
      isMounted = false;
    };
  }, []);

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

    if (currentTrack.mediaUrl) {
      el.src = currentTrack.mediaUrl;
      el.playbackRate = playbackSpeed;
      el.volume = isMuted ? 0 : volume / 100;
      el.muted = isMuted;

      if (isPlaying) {
        el.play().catch((e) => {
          console.log('Autoplay prevented or waiting for user interaction:', e);
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrackIndex, currentTrack.mediaUrl, currentTrack.mediaType]);

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
          console.warn('Play error:', err);
          setIsPlaying(false);
        });
    }
  }, [currentTrack.mediaType, isPlaying, initWebAudio]);

  const handlePlayTrack = useCallback((index: number) => {
    setCurrentTrackIndex(index);
    setCurrentTime(0);
    setIsPlaying(true);

    const targetTrack = tracks[index];
    if (targetTrack?.mediaType === 'video' && activeTab !== 'video-player') {
      setActiveTab('video-player');
    }
  }, [tracks, activeTab]);

  const handleNextTrack = useCallback(() => {
    if (isShuffle) {
      const nextIndex = Math.floor(Math.random() * tracks.length);
      setCurrentTrackIndex(nextIndex);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    }
    setCurrentTime(0);
    setIsPlaying(true);
  }, [isShuffle, tracks.length]);

  const handlePrevTrack = useCallback(() => {
    const el = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current;
    if (el && el.currentTime > 3) {
      el.currentTime = 0;
      setCurrentTime(0);
    } else {
      setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
      setCurrentTime(0);
    }
    setIsPlaying(true);
  }, [currentTrack.mediaType, tracks.length]);

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
  const handleLoadLocalFiles = async () => {
    try {
      const files = await openLocalMediaFiles();
      if (!files || files.length === 0) return;

      const parsedTracks: Track[] = [];
      for (let i = 0; i < files.length; i++) {
        const trk = await parseFileToTrack(files[i], tracks.length + i);
        parsedTracks.push(trk);
      }

      setTracks((prev) => [...parsedTracks, ...prev]);
      setCurrentTrackIndex(0);
      setCurrentTime(0);
      setIsPlaying(true);

      const firstIsVideo = parsedTracks[0]?.mediaType === 'video';
      if (firstIsVideo) {
        setActiveTab('video-player');
      } else {
        setActiveTab('now-playing');
      }

      showToast(`Successfully imported ${parsedTracks.length} local file(s)`);
    } catch (err) {
      console.error('Failed to load local files:', err);
      showToast('Could not load local files. Please try again.');
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
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    if (!isDraggingScrubber.current) {
      setCurrentTime(e.currentTarget.currentTime);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    if (e.currentTarget.duration && !isNaN(e.currentTarget.duration)) {
      setDuration(Math.round(e.currentTarget.duration));
    }
  };

  const handleMediaEnded = () => {
    if (repeatMode === 'one') {
      const el = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current;
      if (el) {
        el.currentTime = 0;
        el.play();
      }
    } else if (repeatMode === 'all') {
      handleNextTrack();
    } else {
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

  return (
    <div
      ref={appRootRef}
      id="phoenix-media-player-root"
      className="relative flex h-[100dvh] w-screen flex-col overflow-hidden bg-zinc-950 font-sans text-zinc-100 shadow-2xl select-none"
    >
      {/* =========================================================
          HIDDEN REAL HTML5 MEDIA ENGINES (<audio> & <video>)
          ========================================================= */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleMediaEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
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
          onPause={() => setIsPlaying(false)}
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
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-bounce border border-indigo-400/40">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================
          CUSTOM TITLE BAR (WINDOWS MEDIA PLAYER IMMERSIVE THEME)
          ========================================================= */}
      <header
        id="title-bar"
        className="z-30 flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0b0d12]/75 px-3 backdrop-blur-xl select-none sm:px-4"
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
          <img src="/icon-512.png" alt="" aria-hidden="true" className="h-7 w-7 rounded-lg object-contain" />
          <span className="truncate text-xs font-semibold tracking-wide text-zinc-300 sm:text-sm">
            Phoenix Media Player
          </span>
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
          currentTrackIsVideo={currentTrack.mediaType === 'video'}
          isMobileNavOpen={isMobileNavOpen}
          onCloseMobileNav={() => setIsMobileNavOpen(false)}
          onOpenEqualizer={() => setShowEqualizerModal(true)}
          onSearch={handleNavigateToSearch}
          playlists={MOCK_PLAYLISTS}
          selectedSidebar={selectedSidebar}
          setActiveTab={setActiveTab}
          setSelectedSidebar={setSelectedSidebar}
          tracks={tracks}
        />

        {/* ==========================================
            CENTER MAIN CANVAS (IMMERSIVE THEME)
            ========================================== */}
        <main className="relative flex flex-1 flex-col overflow-hidden bg-[#090b10]">
          {/* Radial ambient background highlight */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(129,140,248,0.13),transparent_70%)] pointer-events-none" />

          <PlayerHeader
            activeTab={activeTab}
            isLyricsOpen={showLyricsPanel}
            onImportFiles={handleLoadLocalFiles}
            onToggleLyrics={() => setShowLyricsPanel((open) => !open)}
            searchInputRef={searchInputRef}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearchFocus={handleSearchFocus}
          />

          {/* TAB 1: NOW PLAYING (IMMERSIVE SHOWCASE HERO) */}
          {activeTab === 'now-playing' && currentTrack.mediaType !== 'video' && (
            <div className="relative z-10 flex-1 flex flex-col justify-between overflow-y-auto px-6 lg:px-12 xl:px-16 py-6 animate-fadeIn">
              <section className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 xl:gap-14 my-auto">
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
                    <div className="absolute inset-0 bg-black/10" />

                    {/* Centered glass playback badge */}
                    <div
                      onClick={handleTogglePlay}
                      className="relative flex flex-col items-center gap-3 cursor-pointer group/badge"
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
                    </div>
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

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-2">
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
          {(activeTab === 'video-player' || currentTrack.mediaType === 'video') && activeTab !== 'file-browser' && activeTab !== 'visualizer' && activeTab !== 'albums' && activeTab !== 'playlists' && (
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
                {MOCK_ALBUMS.map((alb) => (
                  <div
                    key={alb.id}
                    onClick={() => setActiveTab('now-playing')}
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
                        {alb.year} • {alb.trackCount} Tracks
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PLAYLISTS */}
          {activeTab === 'playlists' && (
            <div className="flex-1 space-y-6 overflow-y-auto p-4 animate-fadeIn sm:p-6 lg:p-8">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                  Curated DSP Playlists
                </h2>
                <p className="text-xs text-zinc-400">Handcrafted audio atmospheres</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {MOCK_PLAYLISTS.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => setActiveTab('now-playing')}
                    className="p-5 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-indigo-500/40 transition-all cursor-pointer group flex flex-col gap-4"
                  >
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-zinc-800 relative">
                      <img
                        src={pl.coverArt}
                        alt={pl.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                          <Play className="w-6 h-6 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: pl.accentColor }}
                        />
                        <h3 className="font-bold text-sm text-zinc-100 truncate">{pl.name}</h3>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                        {pl.description}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-500 mt-2">
                        {pl.trackCount} Tracks in Queue
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* ==========================================
            RIGHT QUEUE DRAWER (SLIDE OVER)
            ========================================== */}
        {showQueueDrawer && (
          <aside className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#11141c]/95 backdrop-blur-2xl border-l border-white/[0.08] p-6 flex flex-col gap-4 z-20 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Playback Queue ({tracks.length})
                </h3>
              </div>
              <button
                onClick={() => setShowQueueDrawer(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {tracks.map((t, idx) => {
                const isCur = idx === currentTrackIndex;
                return (
                  <div
                    key={t.id}
                    onClick={() => handlePlayTrack(idx)}
                    className={`p-2.5 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                      isCur
                        ? 'bg-indigo-500/20 border border-indigo-500/40 text-white'
                        : 'hover:bg-white/5 text-zinc-400'
                    }`}
                  >
                    <img
                      src={t.coverArt}
                      alt={t.title}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-lg object-cover border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isCur ? 'text-indigo-400' : 'text-zinc-200'}`}>
                        {t.title}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">{t.artist}</p>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {formatTime(t.duration)}
                    </span>
                  </div>
                );
              })}
            </div>

          </aside>
        )}
      </div>

      <PlaybackBar
        analyserNode={analyserRef.current}
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
