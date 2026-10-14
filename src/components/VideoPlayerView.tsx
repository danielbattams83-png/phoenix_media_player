import React from 'react';
import { Maximize, Volume2, VolumeX, Play, Pause, Film } from 'lucide-react';
import { Track } from '../types';

interface VideoPlayerViewProps {
  track: Track;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onToggleFullscreen: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  track,
  videoRef,
  isPlaying,
  onTogglePlay,
  onToggleFullscreen,
  isMuted,
  onToggleMute
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 relative overflow-hidden animate-fadeIn">
      {/* Dynamic ambient backdrop */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none blur-3xl"
        style={{
          background: `radial-gradient(circle at center, ${track.accentColor} 0%, transparent 70%)`
        }}
      />

      <div className="w-full max-w-4xl bg-zinc-950/90 rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative group flex flex-col">
        {/* Video Header bar */}
        <div className="px-6 py-3 bg-zinc-900/60 border-b border-white/5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              {track.title}
            </span>
            <span className="text-[10px] font-mono text-zinc-500">• {track.format} Video</span>
          </div>
          <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            Hardware Accelerated
          </span>
        </div>

        {/* Video Canvas / Element */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            src={track.mediaUrl}
            className="w-full h-full object-contain cursor-pointer"
            onClick={onTogglePlay}
            playsInline
          />

          {/* Center Play Overlay on hover or pause */}
          {!isPlaying && (
            <div
              onClick={onTogglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer backdrop-blur-[2px] transition-all"
            >
              <div className="w-20 h-20 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                <Play className="w-8 h-8 fill-white ml-1" />
              </div>
            </div>
          )}

          {/* On-Video Quick Controls Overlay */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <button
              onClick={onTogglePlay}
              className="p-1.5 text-white hover:text-indigo-400 transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>
            <button
              onClick={onToggleMute}
              className="p-1.5 text-white hover:text-indigo-400 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 text-white hover:text-indigo-400 transition-colors"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
