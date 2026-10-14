import React from 'react';
import { Keyboard, X, Play, Volume2, FastForward, Rewind, Maximize2 } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', action: 'Play / Pause media', icon: <Play className="w-3.5 h-3.5" /> },
    { key: 'M', action: 'Mute / Unmute audio', icon: <Volume2 className="w-3.5 h-3.5" /> },
    { key: '← (Left Arrow)', action: 'Seek backward 5 seconds', icon: <Rewind className="w-3.5 h-3.5" /> },
    { key: '→ (Right Arrow)', action: 'Seek forward 5 seconds', icon: <FastForward className="w-3.5 h-3.5" /> },
    { key: '↑ / ↓ (Up/Down)', action: 'Volume Up / Down (5%)', icon: <Volume2 className="w-3.5 h-3.5" /> },
    { key: 'F', action: 'Toggle Fullscreen', icon: <Maximize2 className="w-3.5 h-3.5" /> },
    { key: 'N', action: 'Next Track', icon: <FastForward className="w-3.5 h-3.5" /> },
    { key: 'P', action: 'Previous Track', icon: <Rewind className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide uppercase">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                Windows Media Player Pro Controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-2">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-white/5 text-xs"
            >
              <div className="flex items-center gap-2.5 text-zinc-300">
                <span className="text-indigo-400">{sc.icon}</span>
                <span>{sc.action}</span>
              </div>
              <kbd className="px-2.5 py-1 bg-zinc-800 border border-white/10 rounded text-[11px] font-mono font-bold text-zinc-200 shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
