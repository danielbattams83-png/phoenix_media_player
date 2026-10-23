import { useState } from 'react';
import type { Track } from '../types';

export function QueuePanel({ tracks, queue, onChange, onClose }: { tracks: Track[]; queue: string[]; onChange: (queue: string[]) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [removed, setRemoved] = useState<{ id: string; index: number } | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= queue.length) return;
    const next = [...queue]; const [id] = next.splice(from, 1); next.splice(to, 0, id); onChange(next);
  };
  const add = (id: string, first: boolean) => { const next = queue.filter(item => item !== id); onChange(first ? [id, ...next] : [...next, id]); };
  return <aside aria-label="Playback queue" className="absolute inset-y-0 right-0 z-40 flex w-full max-w-md flex-col gap-4 border-l border-white/10 bg-zinc-950 p-4 shadow-2xl">
    <header className="flex items-center justify-between"><h2 className="text-lg font-semibold">Up next · {queue.length}</h2><button onClick={onClose} className="min-h-11 px-3">Close queue</button></header>
    <p className="text-xs text-zinc-400">Plays before your library or playlist, even with shuffle. This queue lasts for this session.</p>
    <div className="flex-1 space-y-2 overflow-y-auto">
      {!queue.length && <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-zinc-400">Nothing queued yet. Choose a track below.</p>}
      {queue.map((id, index) => { const track = tracks.find(t => t.id === id); if (!track) return null; return <div key={id} draggable onDragStart={event => event.dataTransfer.setData('application/phoenix-queue', String(index))} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); event.stopPropagation(); const from = event.dataTransfer.getData('application/phoenix-queue'); if (from !== '') move(Number(from), index); }} className="rounded-xl bg-white/5 p-3">
        <p className="truncate text-sm font-medium">{index + 1}. {track.title}</p><div className="mt-1 flex items-center gap-2 text-xs text-zinc-400"><button disabled={!index} onClick={() => move(index, index - 1)} aria-label={`Move ${track.title} up`} className="min-h-11 px-2">Move up</button><button disabled={index === queue.length - 1} onClick={() => move(index, index + 1)} aria-label={`Move ${track.title} down`} className="min-h-11 px-2">Down</button><button onClick={() => { setRemoved({ id, index }); onChange(queue.filter(item => item !== id)); }} aria-label={`Remove ${track.title}`} className="ml-auto min-h-11 px-2">Remove</button></div>
      </div>; })}
      {removed && <button className="min-h-11 text-sm text-amber-200" onClick={() => { const next = queue.filter(id => id !== removed.id); next.splice(Math.min(removed.index, next.length), 0, removed.id); onChange(next); setRemoved(null); }}>Undo removal</button>}
      <label className="mt-4 block text-xs text-zinc-400">Add from library<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search title or artist" className="my-2 min-h-11 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 text-sm text-white" /></label>
      {tracks.filter(track => `${track.title} ${track.artist}`.toLowerCase().includes(search.toLowerCase())).map(track => <div key={track.id} className="border-b border-white/5 py-2"><p className="truncate text-sm">{track.title}</p><div className="flex gap-4 text-xs text-amber-200"><button className="min-h-11" onClick={() => add(track.id, true)}>Play next</button><button className="min-h-11" onClick={() => add(track.id, false)}>Add to queue</button></div></div>)}
    </div>
  </aside>;
}
