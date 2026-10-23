import React, { useRef, useState } from 'react';
import {
  Heart,
  Keyboard,
  ListMusic,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Square,
  Shuffle,
  SkipBack,
  SkipForward,
  Sliders,
  Volume1,
  Volume2,
  VolumeX
} from 'lucide-react';
import type { Track } from '../types';
import { MiniVisualizer } from './MiniVisualizer';

interface PlaybackBarProps {
  analyserNode: AnalyserNode | null;
  embedded?: boolean;
  pullout?: boolean;
  currentTime: number;
  effectiveDuration: number;
  isMuted: boolean;
  isPlaying: boolean;
  isQueueOpen: boolean;
  isShuffle: boolean;
  onNextTrack: () => void;
  onOpenEqualizer: () => void;
  onOpenShortcuts: () => void;
  onPreviousTrack: () => void;
  onSeek: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onStop: () => void;
  onSetPlaybackSpeed: (speed: number) => void;
  onSetVolume: (volume: number) => void;
  onShowNowPlaying: () => void;
  onShowVisualizer: () => void;
  onToggleFavorite: (trackId: string) => void;
  onToggleFullscreen: () => void;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  onToggleQueue: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onStartScrubbing: () => void;
  onStopScrubbing: () => void;
  playbackSpeed: number;
  progressPercent: number;
  repeatMode: 'off' | 'all' | 'one';
  track: Track;
  volume: number;
}

function formatTime(seconds: number): string {
  if (Number.isNaN(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  analyserNode,
  embedded = false,
  pullout = false,
  currentTime,
  effectiveDuration,
  isMuted,
  isPlaying,
  isQueueOpen,
  isShuffle,
  onNextTrack,
  onOpenEqualizer,
  onOpenShortcuts,
  onPreviousTrack,
  onSeek,
  onShowNowPlaying,
  onShowVisualizer,
  onSetPlaybackSpeed,
  onSetVolume,
  onToggleFavorite,
  onToggleFullscreen,
  onToggleMute,
  onTogglePlay,
  onToggleQueue,
  onToggleRepeat,
  onToggleShuffle,
  onStop,
  onStartScrubbing,
  onStopScrubbing,
  playbackSpeed,
  progressPercent,
  repeatMode,
  track,
  volume
}) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const time = `${formatTime(currentTime)} / ${formatTime(effectiveDuration)}`;
  return <>
    {!embedded && !pullout && <div className="flex shrink-0 items-center gap-3 border-t border-white/10 bg-zinc-900 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      <button onClick={() => { setExpanded(true); dialog.current?.showModal(); }} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Expand Now Playing">
        <img src={track.coverArt} alt="" className="h-11 w-11 rounded-lg object-cover" /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{track.title}</span><span className="block truncate text-xs text-zinc-400">{track.artist} · {time}</span></span>
      </button>
      <button onClick={onTogglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-200 text-zinc-950">{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
      <button onClick={onNextTrack} aria-label="Next track" className="p-3"><SkipForward className="h-5 w-5" /></button>
    </div>}
    <dialog ref={dialog} onClose={() => setExpanded(false)} aria-labelledby="mobile-now-playing" className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-zinc-950 p-6 text-white backdrop:bg-black/70">
      {expanded && <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between"><h2 id="mobile-now-playing" className="text-xs font-medium uppercase tracking-widest text-amber-200">Now Playing</h2><button onClick={() => dialog.current?.close()} className="min-h-11 px-3 text-sm" autoFocus>Close</button></div>
        <img src={track.coverArt} alt="" className="mx-auto aspect-square w-[min(45vw,24dvh)] max-w-64 rounded-2xl object-cover shadow-2xl" />
        <div><h3 className="break-words text-2xl font-semibold">{track.title}</h3><p className="mt-1 text-zinc-400">{track.artist}</p></div>
        <div><input type="range" aria-label="Playback position" min={0} max={effectiveDuration} step={0.1} value={currentTime} onChange={onSeek} style={{ '--range-progress': `${progressPercent}%` } as React.CSSProperties} className="playback-range h-11 w-full accent-amber-200" /><p className="text-center text-xs tabular-nums text-zinc-400">{time}</p></div>
        <div className="flex items-center justify-center gap-5"><button aria-label="Previous track" onClick={onPreviousTrack} className="p-3"><SkipBack /></button><button aria-label={isPlaying ? 'Pause' : 'Play'} onClick={onTogglePlay} className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-200 text-zinc-950">{isPlaying ? <Pause /> : <Play />}</button><button aria-label="Next track" onClick={onNextTrack} className="p-3"><SkipForward /></button></div>
        <div className="flex items-center justify-around"><button onClick={onToggleShuffle} aria-label="Toggle shuffle" aria-pressed={isShuffle} className={`p-3 ${isShuffle ? 'text-amber-200' : 'text-zinc-400'}`}><Shuffle /></button><button onClick={() => onToggleFavorite(track.id)} aria-label="Toggle favorite" aria-pressed={track.isFavorite} className="p-3"><Heart className={track.isFavorite ? 'fill-rose-400 text-rose-400' : ''} /></button><button onClick={onToggleRepeat} aria-label={`Repeat ${repeatMode}`} className={`p-3 ${repeatMode !== 'off' ? 'text-amber-200' : 'text-zinc-400'}`}>{repeatMode === 'one' ? <Repeat1 /> : <Repeat />}</button></div>
        <label className="flex items-center justify-between text-sm text-zinc-400">Playback speed<select aria-label="Playback speed" value={playbackSpeed} onChange={event => onSetPlaybackSpeed(Number(event.target.value))} className="min-h-11 rounded-lg bg-zinc-800 px-4 text-white">{[0.75, 1, 1.25, 1.5, 2].map(speed => <option key={speed} value={speed}>{speed}x</option>)}</select></label>
      </div>}
    </dialog>
  <footer
    id="bottom-playback-bar"
    aria-label="Playback controls"
    className={pullout
      ? 'relative z-30 flex h-[min(70vh,560px)] w-[min(340px,calc(100vw-3rem))] shrink-0 flex-col justify-between gap-5 overflow-y-auto rounded-r-2xl border border-l-0 border-white/[0.12] bg-[#0b0d12]/95 p-4 shadow-[12px_0_36px_rgba(0,0,0,0.35)] backdrop-blur-2xl select-none'
      : embedded
      ? 'relative z-20 mx-auto my-6 grid w-full max-w-3xl shrink-0 grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-3 gap-y-2 rounded-2xl border border-white/[0.12] bg-white/[0.075] p-4 shadow-[0_-12px_36px_rgba(0,0,0,0.22)] backdrop-blur-2xl select-none'
      : 'relative z-30 hidden shrink-0 grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-3 gap-y-2 border-t border-white/[0.08] bg-[#0b0d12]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_36px_rgba(0,0,0,0.22)] backdrop-blur-2xl select-none md:flex md:h-24 md:justify-between md:gap-4 md:px-6 md:py-0 xl:px-8'}
  >
    <div className={pullout
      ? 'pointer-events-none absolute left-0 right-0 top-0 h-px bg-white/[0.06]'
      : 'pointer-events-none absolute -top-px left-0 right-0 h-px bg-white/[0.06]'}
    />

    <div className={embedded
      ? 'col-start-1 row-start-1 flex min-w-0 items-center gap-2.5'
      : pullout
        ? 'flex min-w-0 flex-col items-center gap-2.5 text-center'
        : 'col-start-1 row-start-1 flex min-w-0 items-center gap-2.5 md:w-[28%]'}
    >
      <button
        className="relative shrink-0 overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300"
        onClick={onShowNowPlaying}
        title="Show current track"
        aria-label="Show current track"
      >
        <img
          src={track.coverArt}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="h-10 w-10 object-cover md:h-12 md:w-12"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity hover:opacity-100">
          <Maximize2 className="h-4 w-4 text-white" />
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white">{track.title}</p>
        <p className="truncate text-[11px] text-zinc-400">{track.artist}</p>
      </div>
      <button
        onClick={() => onToggleFavorite(track.id)}
        className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-rose-300"
        title={track.isFavorite ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
        aria-label={track.isFavorite ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
      >
        <Heart className={`h-4 w-4 ${track.isFavorite ? 'fill-rose-400 text-rose-400' : ''}`} />
      </button>
      <button
        className="hidden rounded-md p-1 opacity-80 transition-opacity hover:opacity-100 sm:block"
        onClick={onShowVisualizer}
        title="Open visualizer"
        aria-label="Open visualizer"
      >
        <MiniVisualizer
          isPlaying={isPlaying}
          accentColor={track.accentColor}
          analyserNode={analyserNode}
          bars={6}
          className="h-3.5 w-9"
        />
      </button>
    </div>

    <div className={embedded
      ? 'col-span-2 row-start-2 flex min-w-0 flex-col items-center gap-1'
      : pullout
        ? 'flex min-w-0 flex-col items-center gap-3'
        : 'col-span-2 row-start-2 flex min-w-0 flex-col items-center gap-1 md:w-[44%] md:min-w-[250px] md:max-w-xl'}
    >
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onToggleShuffle}
          className={`rounded-full p-2 transition-colors hover:bg-white/[0.06] hover:text-white ${isShuffle ? 'text-indigo-300' : 'text-zinc-400'}`}
          title={isShuffle ? 'Turn shuffle off' : 'Turn shuffle on'}
          aria-label="Toggle shuffle"
          aria-pressed={isShuffle}
        >
          <Shuffle className="h-4 w-4" />
        </button>
        <button
          onClick={onPreviousTrack}
          className="rounded-full p-2 text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          title="Previous track"
          aria-label="Previous track"
        >
          <SkipBack className="h-5 w-5 fill-current" />
        </button>
        <button
          onClick={onStop}
          className="rounded-full p-2 text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          title="Stop and return to the beginning"
          aria-label="Stop"
        >
          <Square className="h-4 w-4 fill-current" />
        </button>
        <button
          onClick={onTogglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 shadow-[0_8px_28px_rgba(255,255,255,0.16)] transition-transform hover:scale-105 active:scale-95 md:h-11 md:w-11"
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
        </button>
        <button
          onClick={onNextTrack}
          className="rounded-full p-2 text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          title="Next track"
          aria-label="Next track"
        >
          <SkipForward className="h-5 w-5 fill-current" />
        </button>
        <button
          onClick={onToggleRepeat}
          className={`rounded-full p-2 transition-colors hover:bg-white/[0.06] hover:text-white ${repeatMode !== 'off' ? 'text-indigo-300' : 'text-zinc-400'}`}
          title={`Repeat ${repeatMode}`}
          aria-label={`Toggle repeat, current mode ${repeatMode}`}
        >
          {repeatMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex w-full items-center gap-2.5">
        <span className="w-9 text-right text-[10px] tabular-nums text-zinc-500">
          {formatTime(currentTime)}
        </span>
        <input
          id="seek-slider"
          type="range"
          min={0}
          max={effectiveDuration}
          step={0.1}
          value={currentTime}
          onChange={onSeek}
          onPointerDown={onStartScrubbing}
          onPointerUp={onStopScrubbing}
          onPointerCancel={onStopScrubbing}
          className="playback-range h-4 w-full cursor-pointer rounded-lg focus:outline-none"
          style={{ '--range-progress': `${progressPercent}%` } as React.CSSProperties}
          aria-label="Track progress"
        />
        <span className="w-9 text-[10px] tabular-nums text-zinc-500">
          {formatTime(effectiveDuration)}
        </span>
      </div>
    </div>

    <div className={embedded
      ? 'col-start-2 row-start-1 flex items-center justify-end gap-1 md:gap-2'
      : pullout
        ? 'flex flex-wrap items-center justify-center gap-1.5 border-t border-white/[0.08] pt-3'
        : 'col-start-2 row-start-1 flex items-center justify-end gap-1 md:w-[28%] md:gap-2'}
    >
      <select
        value={playbackSpeed}
        onChange={(event) => onSetPlaybackSpeed(Number(event.target.value))}
        className="hidden rounded-full border border-white/[0.08] bg-white/[0.045] px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-300/40 lg:block"
        title="Playback speed"
        aria-label="Playback speed"
      >
        {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
          <option key={speed} value={speed} className="bg-zinc-900">
            {speed}x
          </option>
        ))}
      </select>
      <button
        onClick={onOpenEqualizer}
        className="hidden rounded-full p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:inline-flex"
        title="Audio settings"
        aria-label="Audio settings"
      >
        <Sliders className="h-4 w-4" />
      </button>
      <button
        onClick={onToggleQueue}
        className={`rounded-full p-2 transition-colors hover:bg-white/5 hover:text-white ${isQueueOpen ? 'text-indigo-300' : 'text-zinc-400'}`}
        title="Toggle playback queue"
        aria-label="Toggle playback queue"
        aria-pressed={isQueueOpen}
      >
        <ListMusic className="h-4 w-4" />
      </button>
      <button
        onClick={onToggleFullscreen}
        className="hidden rounded-full p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white xl:inline-flex"
        title="Toggle full screen"
        aria-label="Toggle full screen"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
      <button
        onClick={onOpenShortcuts}
        className="hidden rounded-full p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white xl:inline-flex"
        title="Keyboard shortcuts"
        aria-label="Keyboard shortcuts"
      >
        <Keyboard className="h-4 w-4" />
      </button>
      <button
        onClick={onToggleMute}
        className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
        aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="h-4 w-4" />
        ) : volume < 50 ? (
          <Volume1 className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>
      <input
        id="volume-slider"
        type="range"
        min={0}
        max={100}
        value={isMuted ? 0 : volume}
        onChange={(event) => onSetVolume(Number(event.target.value))}
        className="playback-range block h-4 w-14 cursor-pointer rounded-lg focus:outline-none sm:w-16 xl:w-20"
        style={{ '--range-progress': `${isMuted ? 0 : volume}%` } as React.CSSProperties}
        aria-label="Volume"
      />
    </div>
  </footer>
  </>;
};
