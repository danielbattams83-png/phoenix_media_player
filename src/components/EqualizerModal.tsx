import React from 'react';
import { Sliders, X, Sparkles, Volume2, RotateCcw } from 'lucide-react';
import { EqualizerPreset } from '../types';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: EqualizerPreset[];
  selectedPreset: string;
  onSelectPreset: (presetName: string) => void;
  eqBands: number[];
  onBandChange: (index: number, val: number) => void;
  onReset: () => void;
}

const BAND_FREQS = [
  { label: '60 Hz', desc: 'Sub-Bass' },
  { label: '230 Hz', desc: 'Bass' },
  { label: '910 Hz', desc: 'Midrange' },
  { label: '3.6 kHz', desc: 'Presence' },
  { label: '14 kHz', desc: 'Brilliance' }
];

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  presets,
  selectedPreset,
  onSelectPreset,
  eqBands,
  onBandChange,
  onReset
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        id="modal-equalizer-dsp"
        className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl space-y-6 relative overflow-hidden"
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide uppercase">
                Velocity DSP Studio & 5-Band Equalizer
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                Hardware Biquad Audio Filtering • 32-bit Float Pipeline
              </p>
            </div>
          </div>
          <button
            id="btn-close-equalizer-modal"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Selector Buttons */}
        <div className="space-y-2 relative z-10">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Acoustic Profile Presets
            </span>
            <button
              onClick={onReset}
              className="text-[11px] text-zinc-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Flat</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => onSelectPreset(preset.name)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedPreset === preset.name
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* 5-Band Vertical Slider Grid */}
        <div className="p-6 bg-zinc-950/60 border border-white/5 rounded-2xl relative z-10 space-y-4">
          <div className="grid grid-cols-5 gap-4 items-end justify-items-center h-48 py-2">
            {BAND_FREQS.map((band, idx) => {
              const gainVal = eqBands[idx] || 0;
              return (
                <div key={band.label} className="flex flex-col items-center h-full justify-between w-full">
                  <span className="text-[11px] font-mono font-bold text-indigo-400">
                    {gainVal > 0 ? `+${gainVal}` : gainVal} dB
                  </span>

                  <div className="relative flex-1 flex items-center justify-center py-2">
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={1}
                      value={gainVal}
                      onChange={(e) => onBandChange(idx, Number(e.target.value))}
                      className="h-32 w-1.5 appearance-none bg-zinc-800 rounded-full cursor-pointer accent-indigo-500 slider-vertical"
                      style={{
                        writingMode: 'vertical-lr',
                        direction: 'rtl'
                      }}
                    />
                  </div>

                  <div className="text-center space-y-0.5 mt-2">
                    <p className="text-xs font-mono font-semibold text-zinc-200">{band.label}</p>
                    <p className="text-[10px] text-zinc-500">{band.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 relative z-10 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-zinc-300">Live Hardware Filtering: ACTIVE</span>
          </div>
          <button
            id="btn-apply-equalizer"
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30"
          >
            Apply Profile
          </button>
        </div>
      </div>
    </div>
  );
};
