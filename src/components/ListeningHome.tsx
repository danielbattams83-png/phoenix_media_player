import { ArrowUpRight, AudioLines, FolderOpen, Headphones, Library, ListMusic, Music2, Plus, ShieldCheck, Youtube } from 'lucide-react';
import type { RotationalHubDestination } from './RotationalHub';

interface ListeningHomeProps {
  trackCount: number;
  playlistCount: number;
  activeMode: RotationalHubDestination;
  onImport: () => void;
  onImportFolder: () => void;
  onNavigate: (destination: RotationalHubDestination) => void;
  onPlaylists: () => void;
}

export function ListeningHome({ trackCount, playlistCount, activeMode, onImport, onImportFolder, onNavigate, onPlaylists }: ListeningHomeProps) {
  const spaces = [
    { id: 'local-files' as const, label: 'Your library', description: 'All your files. One place.', icon: Library, detail: `${trackCount} tracks` },
    { id: 'spotify' as const, label: 'Spotify', description: 'Connect to your favorites.', icon: Music2, detail: 'Connect account' },
    { id: 'youtube' as const, label: 'YouTube', description: 'Watch. Listen. Discover.', icon: Youtube, detail: 'Open player' },
    { id: 'equalizer' as const, label: 'Sound studio', description: 'Make every note your own.', icon: AudioLines, detail: '5-band equalizer' },
  ];
  return (
    <div className="listening-home relative z-10 mx-auto w-full max-w-7xl space-y-7 px-4 pb-8 sm:px-6 lg:space-y-9 xl:px-8">
      <section className="welcome-panel relative isolate overflow-hidden rounded-2xl border border-white/10 p-6 sm:p-9 lg:p-11">
        <div className="relative z-10 max-w-lg">
          <p className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> A space for your sound</p>
          <h2 className="text-4xl font-semibold leading-[1.1] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">Your world.<br /><span className="text-amber-200">On repeat.</span></h2>
          <p className="mt-5 max-w-sm text-sm leading-6 text-zinc-300">The music you love. The videos you keep. Bring it all together in a player that feels like you.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button onClick={onImport} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-amber-200 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-100"><Plus className="h-4 w-4" /> Add media</button>
            <button onClick={onImportFolder} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-medium text-zinc-200 transition hover:bg-white/10"><FolderOpen className="h-4 w-4" /> Open folder</button>
          </div>
          <p className="mt-5 flex items-center gap-1.5 text-[11px] text-zinc-400"><ShieldCheck className="h-3.5 w-3.5" /> Local files stay on your device.</p>
        </div>
        <img src="/phoenix_logo.png" alt="" className="pointer-events-none absolute right-8 top-1/2 hidden w-[34%] -translate-y-1/2 rounded-full opacity-20 mix-blend-luminosity lg:block" />
      </section>
      <section aria-labelledby="spaces-heading">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 id="spaces-heading" className="text-lg font-semibold tracking-tight">Find your rhythm</h2><span className="text-xs text-zinc-500">One player. Your choice.</span></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {spaces.map(({ id, label, description, icon: Icon, detail }) => (
            <button key={id} onClick={() => onNavigate(id)} className="listening-space group flex min-w-0 flex-col items-start rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-200/30 hover:bg-white/[0.05] sm:p-5" aria-label={`Open ${label}`}>
              <div className="mb-5 flex w-full items-center justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${activeMode === id ? 'bg-amber-200/10 text-amber-200' : 'bg-white/5 text-zinc-300'}`}><Icon className="h-5 w-5" /></span><ArrowUpRight className="h-4 w-4 text-zinc-600 transition group-hover:text-amber-200" /></div>
              <h3 className="text-sm font-semibold text-zinc-100">{label}</h3><p className="mt-1 text-xs leading-5 text-zinc-400">{description}</p><span className="mt-5 text-[10px] font-medium text-zinc-500">{detail}</span>
            </button>
          ))}
        </div>
      </section>
      <section aria-labelledby="collection-heading">
        <div className="mb-4 flex items-center justify-between"><h2 id="collection-heading" className="text-lg font-semibold tracking-tight">Made for your collection</h2><button onClick={() => onNavigate('local-files')} className="flex items-center gap-1 text-xs text-amber-200 hover:text-amber-100">View library <ArrowUpRight className="h-3.5 w-3.5" /></button></div>
        <div className="flex flex-col gap-5 rounded-xl border border-dashed border-white/15 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5 text-zinc-400"><Headphones className="h-5 w-5" /></span><div><h3 className="text-sm font-medium">{trackCount ? 'Your next listening session awaits' : 'Great listening starts here'}</h3><p className="mt-1 text-xs leading-5 text-zinc-400">{trackCount ? `${trackCount} tracks in your library. Put them in a playlist and press play.` : 'Add your first track and make this space your own.'}</p></div></div>
          <button onClick={onPlaylists} className="flex shrink-0 items-center gap-2 self-start rounded-lg border border-white/10 px-4 py-2.5 text-xs text-zinc-300 transition hover:bg-white/5 sm:self-auto"><ListMusic className="h-4 w-4" /> {playlistCount ? `${playlistCount} playlists` : 'Create a playlist'}</button>
        </div>
      </section>
      <p className="text-center text-[10px] tracking-wide text-zinc-500">YOUR MEDIA. YOUR SPACE. PHOENIX.</p>
    </div>
  );
}
