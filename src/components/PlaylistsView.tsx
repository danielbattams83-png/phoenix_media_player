import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ListMusic, Pencil, Plus, Share2, Trash2, Upload, X } from 'lucide-react';
import type { Playlist, Track } from '../types';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

interface PlaylistsViewProps {
  onCreate: (name: string, description: string, trackIds: string[]) => void;
  onDelete: (playlistId: string) => void;
  onImportFolder: () => void;
  onMoveTrack: (playlistId: string, trackId: string, direction: -1 | 1) => void;
  onPlayTrack: (trackId: string) => void;
  onRemoveTrack: (playlistId: string, trackId: string) => void;
  onShareTrack: (track: Track) => void;
  onRename: (playlistId: string, name: string) => void;
  onUpdateDescription: (playlistId: string, description: string) => void;
  onSelect: (playlistId: string) => void;
  onAddTracks: (playlistId: string, trackIds: string[]) => void;
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  tracks: Track[];
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({
  onCreate,
  onDelete,
  onImportFolder,
  onMoveTrack,
  onPlayTrack,
  onRemoveTrack,
  onShareTrack,
  onRename,
  onUpdateDescription,
  onSelect,
  onAddTracks,
  playlists,
  selectedPlaylistId,
  tracks
}) => {
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [addTrackIds, setAddTrackIds] = useState<string[]>([]);
  const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null;
  const playlistTracks = useMemo(
    () => selectedPlaylist?.trackIds.map((id) => tracks.find((track) => track.id === id)).filter((track): track is Track => Boolean(track)) ?? [],
    [selectedPlaylist, tracks]
  );

  const toggleTrack = (trackId: string, ids: string[], setIds: React.Dispatch<React.SetStateAction<string[]>>) => {
    setIds((previous) => previous.includes(trackId) ? previous.filter((id) => id !== trackId) : [...previous, trackId]);
  };

  const createPlaylist = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onCreate(name, newDescription.trim(), selectedTrackIds);
    setNewName('');
    setNewDescription('');
    setSelectedTrackIds([]);
  };

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4 animate-fadeIn sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">Your Playlists</h2>
          <p className="text-xs text-zinc-400">Create and arrange playlists from your music library</p>
        </div>
        <button onClick={onImportFolder} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/10">
          <Upload className="h-4 w-4" /> Import folder as playlist
        </button>
      </div>

      <form onSubmit={createPlaylist} className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Plus className="h-4 w-4 text-indigo-300" /> Create a playlist</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Playlist name" aria-label="Playlist name" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-300/50" required />
          <input value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="Description (optional)" aria-label="Playlist description" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-300/50" />
        </div>
        <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-white/[0.06] p-2">
          {tracks.map((track) => (
            <label key={track.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/5">
              <input type="checkbox" checked={selectedTrackIds.includes(track.id)} onChange={() => toggleTrack(track.id, selectedTrackIds, setSelectedTrackIds)} />
              <span className="truncate">{track.title} <span className="text-zinc-500">· {track.artist}</span></span>
            </label>
          ))}
        </div>
        <button type="submit" className="rounded-full bg-indigo-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-indigo-300">Create playlist</button>
      </form>

      {playlists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">No playlists yet. Create one above or import a folder.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {playlists.map((playlist) => (
            <button key={playlist.id} onClick={() => onSelect(playlist.id)} className={`flex min-w-0 items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${selectedPlaylistId === playlist.id ? 'border-indigo-400/40 bg-indigo-500/10' : 'border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05]'}`}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]" style={{ color: playlist.accentColor }}><ListMusic className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{playlist.name}</span>
                <span className="block truncate text-xs text-zinc-500">{playlist.trackIds.length} tracks</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedPlaylist && (
        <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {editingPlaylistId === selectedPlaylist.id ? (
                <form onSubmit={(event) => { event.preventDefault(); const name = editName.trim(); if (name) onRename(selectedPlaylist.id, name); setEditingPlaylistId(null); }} className="flex gap-2">
                  <input autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} aria-label="Edit playlist name" className="w-48 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm text-white" />
                  <button type="submit" className="text-xs text-indigo-300">Save</button>
                  <button type="button" onClick={() => setEditingPlaylistId(null)} aria-label="Cancel rename"><X className="h-4 w-4" /></button>
                </form>
              ) : (
                <>
                  <h3 className="truncate text-lg font-bold text-white">{selectedPlaylist.name}</h3>
                  <button onClick={() => { setEditingPlaylistId(selectedPlaylist.id); setEditName(selectedPlaylist.name); }} title="Rename playlist" aria-label="Rename playlist" className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"><Pencil className="h-4 w-4" /></button>
                </>
              )}
            </div>
            <button onClick={() => onDelete(selectedPlaylist.id)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-300 hover:bg-rose-400/10"><Trash2 className="h-4 w-4" /> Delete playlist</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {editingDescription ? (
              <form onSubmit={(event) => { event.preventDefault(); onUpdateDescription(selectedPlaylist.id, descriptionDraft.trim()); setEditingDescription(false); }} className="flex min-w-0 flex-1 gap-2">
                <input autoFocus value={descriptionDraft} onChange={(event) => setDescriptionDraft(event.target.value)} aria-label="Edit playlist description" placeholder="Add a description" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-white" />
                <button type="submit" className="text-xs text-indigo-300">Save description</button>
              </form>
            ) : (
              <>
                <p className="flex-1 text-xs text-zinc-400">{selectedPlaylist.description || 'No description'}</p>
                <button onClick={() => { setDescriptionDraft(selectedPlaylist.description); setEditingDescription(true); }} className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white" title="Edit playlist description" aria-label="Edit playlist description"><Pencil className="h-4 w-4" /></button>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-white/[0.06] p-2">
              {tracks.filter((track) => !selectedPlaylist.trackIds.includes(track.id)).map((track) => (
                <label key={track.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/5">
                  <input type="checkbox" checked={addTrackIds.includes(track.id)} onChange={() => toggleTrack(track.id, addTrackIds, setAddTrackIds)} />
                  <span className="truncate">{track.title} <span className="text-zinc-500">· {track.artist}</span></span>
                </label>
              ))}
            </div>
            <button onClick={() => { onAddTracks(selectedPlaylist.id, addTrackIds); setAddTrackIds([]); }} disabled={!addTrackIds.length} className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-200 enabled:hover:bg-white/10 disabled:opacity-40">Add selected songs</button>
          </div>

          <ol className="divide-y divide-white/[0.06]">
            {playlistTracks.map((track, index) => (
              <li key={track.id} className="flex items-center gap-2 py-2">
                <span className="w-6 text-center text-xs tabular-nums text-zinc-500">{index + 1}</span>
                <button onClick={() => onPlayTrack(track.id)} className="min-w-0 flex-1 truncate text-left text-sm text-zinc-200 hover:text-white">{track.title} <span className="text-xs text-zinc-500">· {track.artist}</span></button>
                <span className="text-xs tabular-nums text-zinc-500">{formatTime(track.duration)}</span>
                <button onClick={() => onShareTrack(track)} aria-label={`Share ${track.title}`} title={`Share ${track.title}`} className="rounded p-1 text-zinc-400 hover:bg-white/5 hover:text-white"><Share2 className="h-4 w-4" /></button>
                <button onClick={() => onMoveTrack(selectedPlaylist.id, track.id, -1)} disabled={index === 0} aria-label={`Move ${track.title} up`} className="rounded p-1 text-zinc-400 hover:bg-white/5 disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button>
                <button onClick={() => onMoveTrack(selectedPlaylist.id, track.id, 1)} disabled={index === playlistTracks.length - 1} aria-label={`Move ${track.title} down`} className="rounded p-1 text-zinc-400 hover:bg-white/5 disabled:opacity-25"><ArrowDown className="h-4 w-4" /></button>
                <button onClick={() => onRemoveTrack(selectedPlaylist.id, track.id)} aria-label={`Remove ${track.title} from playlist`} className="rounded p-1 text-zinc-500 hover:bg-rose-400/10 hover:text-rose-300"><X className="h-4 w-4" /></button>
              </li>
            ))}
            {playlistTracks.length === 0 && <li className="py-5 text-center text-xs text-zinc-500">This playlist is empty. Select songs above to add them.</li>}
          </ol>
        </section>
      )}
    </div>
  );
};
