import React from 'react';
import {
  AudioLines,
  Disc3,
  Heart,
  Home,
  Library,
  ListMusic,
  Images,
  Music2,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';
import type { Playlist, PlayerView, Track } from '../types';
import { MagneticLogo } from './MagneticLogo';

interface AppSidebarProps {
  activeTab: PlayerView;
  audioLevel?: number;
  currentTrackIsVideo: boolean;
  isMobileNavOpen: boolean;
  onCloseMobileNav: () => void;
  onOpenEqualizer: () => void;
  onSearch: () => void;
  playlists: Playlist[];
  selectedSidebar: string;
  setActiveTab: React.Dispatch<React.SetStateAction<PlayerView>>;
  setSelectedSidebar: React.Dispatch<React.SetStateAction<string>>;
  tracks: Track[];
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  audioLevel = 0,
  currentTrackIsVideo,
  isMobileNavOpen,
  onCloseMobileNav,
  onOpenEqualizer,
  onSearch,
  playlists,
  selectedSidebar,
  setActiveTab,
  setSelectedSidebar,
  tracks
}) => {
  const navigate = (key: string, view: PlayerView) => {
    setSelectedSidebar(key);
    setActiveTab(view);
    onCloseMobileNav();
  };

  const navItemClass = (active: boolean) =>
    `w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-left transition-colors ${
      active
        ? 'bg-amber-200/10 text-amber-200 font-medium'
        : 'text-zinc-400 hover:bg-white/[0.045] hover:text-white'
    }`;

  return (
    <>
      {isMobileNavOpen && (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onCloseMobileNav}
        />
      )}
      <aside
        id="sidebar-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-7 overflow-y-auto border-r border-white/[0.07] bg-[#0d1017]/95 p-5 shadow-2xl backdrop-blur-2xl transition-transform duration-200 md:relative md:z-0 md:w-60 md:shrink-0 md:translate-x-0 md:bg-white/[0.025] md:shadow-none xl:w-64 ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-3">
            <MagneticLogo audioLevel={audioLevel} size={36} className="rounded-xl" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-white">
                Phoenix Media Player
              </p>
              <p className="text-[10px] text-zinc-500">Your music, your space</p>
            </div>
          </div>
          <button
            onClick={onCloseMobileNav}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-1" aria-label="Primary">
          <button
            onClick={() => navigate('home', currentTrackIsVideo ? 'video-player' : 'now-playing')}
            className={navItemClass(selectedSidebar === 'home')}
          >
            <Home className="h-[18px] w-[18px]" />
            <span>Home</span>
          </button>
          <button
            onClick={onSearch}
            className={navItemClass(selectedSidebar === 'search')}
          >
            <Search className="h-[18px] w-[18px]" />
            <span>Search</span>
          </button>
          <button
            onClick={() => navigate('tracks', 'file-browser')}
            className={navItemClass(selectedSidebar === 'tracks' && activeTab === 'file-browser')}
          >
            <Library className="h-[18px] w-[18px]" />
            <span className="flex-1">Your Library</span>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] tabular-nums text-zinc-400">
              {tracks.length}
            </span>
          </button>
          <button
            onClick={() => navigate('playlists', 'playlists')}
            className={navItemClass(activeTab === 'playlists')}
          >
            <ListMusic className="h-[18px] w-[18px]" />
            <span>Playlists</span>
          </button>
          <button
            onClick={() => navigate('spotify', 'now-playing')}
            className={navItemClass(selectedSidebar === 'spotify')}
          >
            <Music2 className="h-[18px] w-[18px]" />
            <span>Spotify</span>
          </button>
        </nav>

        <div className="space-y-2">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Explore
          </p>
          <button
            onClick={() => navigate('albums', 'albums')}
            className={navItemClass(activeTab === 'albums')}
          >
            <Disc3 className="h-[18px] w-[18px]" />
            <span>Albums</span>
          </button>
          <button
            onClick={() => navigate('images', 'images')}
            className={navItemClass(activeTab === 'images')}
          >
            <Images className="h-[18px] w-[18px]" />
            <span>Images</span>
          </button>
          <button
            onClick={() => navigate('favorites', 'file-browser')}
            className={navItemClass(selectedSidebar === 'favorites')}
          >
            <Heart className="h-[18px] w-[18px]" />
            <span className="flex-1">Liked Songs</span>
            <span className="text-[10px] tabular-nums text-zinc-500">
              {tracks.filter((track) => track.isFavorite).length}
            </span>
          </button>
          <button
            onClick={() => navigate('visualizer', 'visualizer')}
            className={navItemClass(activeTab === 'visualizer')}
          >
            <AudioLines className="h-[18px] w-[18px]" />
            <span>Visualizer</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 border-t border-white/[0.06] pt-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Your playlists
          </p>
          <nav className="space-y-1" aria-label="Your playlists">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => navigate(playlist.id, 'playlists')}
                className={navItemClass(selectedSidebar === playlist.id && activeTab === 'playlists')}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: playlist.accentColor }}
                />
                <span className="truncate">{playlist.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={onOpenEqualizer}
          className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-3 text-left text-sm text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white"
        >
          <SlidersHorizontal className="h-[18px] w-[18px] text-indigo-300" />
          <span>Audio settings</span>
        </button>
      </aside>
    </>
  );
};
