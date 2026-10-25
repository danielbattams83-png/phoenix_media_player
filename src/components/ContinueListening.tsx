import { Play, History } from 'lucide-react';
import type { Track } from '../types';
import type { ListeningEntry } from '../utils/persistence';

export function ContinueListening({ tracks, history, onResume }: { tracks: Track[]; history: ListeningEntry[]; onResume: (id: string, position: number) => void }) {
  const recent = [...history].sort((a, b) => b.playedAt - a.playedAt).flatMap(entry => {
    const track = tracks.find(track => track.id === entry.id);
    return track ? [{ ...entry, track }] : [];
  }).slice(0, 6);
  return <section aria-labelledby="continue-heading" className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-7 sm:px-6 xl:px-8">
    <div className="mb-4 flex items-center justify-between"><h2 id="continue-heading" className="text-lg font-semibold">Continue listening</h2><History className="h-4 w-4 text-amber-200" /></div>
    {recent.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{recent.map(({ track, position }) => <button key={track.id} onClick={() => onResume(track.id, position)} className="beat-card flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.07]" aria-label={`Resume ${track.title}`}>
      <img src={track.coverArt} alt="" className="h-14 w-14 rounded-lg object-cover" />
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{track.title}</span><span className="block truncate text-xs text-zinc-400">{track.artist}</span><span className="mt-1 block text-xs text-amber-200">{position > 0 ? `Resume at ${Math.floor(position / 60)}:${Math.floor(position % 60).toString().padStart(2, '0')}` : 'Play again'}</span></span><Play className="h-4 w-4 shrink-0 text-amber-200" />
    </button>)}</div> : <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-zinc-400">Your recently played media will appear here. Playback positions are saved on this device.</p>}
  </section>;
}
