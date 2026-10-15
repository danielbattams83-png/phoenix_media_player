import React from 'react';
import { Mic2, Search, Upload, X } from 'lucide-react';
import type { PlayerView } from '../types';

interface PlayerHeaderProps {
  activeTab: PlayerView;
  isLyricsOpen: boolean;
  onImportFiles: () => void;
  onToggleLyrics: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  onSearchFocus: () => void;
}

function getViewTitle(activeTab: PlayerView): string {
  if (activeTab === 'video-player' || activeTab === 'now-playing') return 'Now Playing';
  if (activeTab === 'file-browser') return 'Your Library';
  if (activeTab === 'visualizer') return 'Visualizer';
  if (activeTab === 'albums') return 'Albums';
  if (activeTab === 'playlists') return 'Playlists';
  if (activeTab === 'spotify') return 'Spotify';
  if (activeTab === 'youtube') return 'YouTube';
  return 'Images';
}

export const PlayerHeader: React.FC<PlayerHeaderProps> = ({
  activeTab,
  isLyricsOpen,
  onImportFiles,
  onToggleLyrics,
  searchInputRef,
  searchQuery,
  setSearchQuery,
  onSearchFocus
}) => (
  <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-5 sm:px-6 xl:px-8">
    <div>
      <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
        {getViewTitle(activeTab)}
      </h1>
      <p className="mt-0.5 text-xs text-zinc-500">
        {activeTab === 'now-playing' || activeTab === 'video-player'
          ? 'Your soundtrack, right now'
          : 'Explore your music collection'}
      </p>
    </div>
    <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
      <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.045] px-4 py-2.5 transition-colors focus-within:border-indigo-300/40 sm:w-64 sm:flex-none">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          id="input-media-search"
          ref={searchInputRef}
          type="search"
          placeholder="Search tracks, artists, albums"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onFocus={onSearchFocus}
          className="min-w-0 flex-1 bg-transparent text-xs text-zinc-100 outline-none placeholder:text-zinc-500"
          aria-label="Search tracks, artists, and albums"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="rounded-full p-0.5 text-zinc-500 hover:text-zinc-200"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </label>
      <button
        onClick={onImportFiles}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-indigo-400 px-4 text-xs font-semibold text-zinc-950 shadow-[0_6px_24px_rgba(129,140,248,0.2)] transition hover:bg-indigo-300 active:scale-[0.98]"
        title="Import media files"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Add music</span>
      </button>
      {(activeTab === 'now-playing' || activeTab === 'video-player') && (
        <button
          id="btn-toggle-lyrics"
          onClick={onToggleLyrics}
          className={`hidden rounded-full border p-2.5 transition-colors sm:inline-flex ${
            isLyricsOpen
              ? 'border-indigo-300/20 bg-indigo-400/15 text-indigo-200'
              : 'border-white/[0.07] bg-white/[0.04] text-zinc-400 hover:text-zinc-200'
          }`}
          title="Toggle synced lyrics"
          aria-label="Toggle synced lyrics"
          aria-pressed={isLyricsOpen}
        >
          <Mic2 className="h-4 w-4" />
        </button>
      )}
    </div>
  </header>
);
