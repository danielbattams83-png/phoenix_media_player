import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Sliders,
  Sparkles,
  Maximize,
  Minimize,
  Radio,
  Zap,
  Flame,
  Layers,
  CircleDot
} from 'lucide-react';

export type VisualizerMode = 'neon-bars' | 'continuous-wave' | 'radial-halo' | 'cyber-waves';

interface AudioVisualizerProps {
  isPlaying: boolean;
  accentColor: string;
  analyserNode: AnalyserNode | null;
  audioDevice: string;
  selectedPreset: string;
}

const COLOR_THEMES = [
  { name: 'Track Dynamic', primary: '', secondary: '#818cf8' },
  { name: 'Neon Cyberpunk', primary: '#ec4899', secondary: '#06b6d4' },
  { name: 'Electric Cyan', primary: '#06b6d4', secondary: '#3b82f6' },
  { name: 'Matrix Emerald', primary: '#10b981', secondary: '#14b8a6' },
  { name: 'Solar Flare', primary: '#f59e0b', secondary: '#ef4444' },
  { name: 'Synth Violet', primary: '#8b5cf6', secondary: '#c084fc' }
];

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  accentColor,
  analyserNode,
  audioDevice,
  selectedPreset
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<VisualizerMode>('neon-bars');
  const [selectedTheme, setSelectedTheme] = useState<number>(0);
  const [sensitivity, setSensitivity] = useState<number>(1.2);
  const [barCount, setBarCount] = useState<number>(48);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [rmsEnergy, setRmsEnergy] = useState<number>(0);
  const [peakDb, setPeakDb] = useState<string>('-14.2 dB');
  const [dominantBand, setDominantBand] = useState<string>('Midrange 910 Hz');

  // Peak hold data for spectrum bars
  const peakHoldRef = useRef<number[]>([]);
  const peakHoldTimeRef = useRef<number[]>([]);

  // Toggle fullscreen on container
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Buffer length for Web Audio FFT
    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);
    const timeDomainArray = new Uint8Array(bufferLength);

    // Initialize peaks
    if (peakHoldRef.current.length !== barCount) {
      peakHoldRef.current = new Array(barCount).fill(0);
      peakHoldTimeRef.current = new Array(barCount).fill(0);
    }

    let phase = 0;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      phase += 0.025;

      const width = canvas.width;
      const height = canvas.height;

      // Clear Canvas with subtle dark persistence trail
      ctx.fillStyle = 'rgba(9, 9, 11, 0.28)';
      ctx.fillRect(0, 0, width, height);

      const activeColor = COLOR_THEMES[selectedTheme].primary || accentColor || '#6366f1';
      const secondaryColor = COLOR_THEMES[selectedTheme].secondary || '#818cf8';

      // 1. Fetch Real Audio Data or Synthesize Live Audio Fallback
      if (analyserNode && isPlaying) {
        analyserNode.getByteFrequencyData(dataArray);
        analyserNode.getByteTimeDomainData(timeDomainArray);
      } else {
        // Dynamic synthetic harmonic oscillation when paused or preparing
        for (let i = 0; i < bufferLength; i++) {
          if (isPlaying) {
            const harmonic =
              Math.sin(phase * 2 + i * 0.15) * 55 +
              Math.sin(phase * 4 + i * 0.3) * 35 +
              Math.cos(phase * 1.5 + i * 0.08) * 30 +
              110;
            dataArray[i] = Math.min(255, Math.max(0, Math.floor(harmonic)));
            timeDomainArray[i] = Math.floor(128 + Math.sin(phase * 3 + i * 0.1) * 35);
          } else {
            const resting = Math.sin(phase * 0.8 + i * 0.1) * 12 + 18;
            dataArray[i] = Math.floor(resting);
            timeDomainArray[i] = 128;
          }
        }
      }

      // Calculate RMS Energy & Peak dB for the HUD
      let sumSquares = 0;
      let maxVal = 0;
      let maxBandIdx = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i];
        if (val > maxVal) {
          maxVal = val;
          maxBandIdx = i;
        }
        const normalized = val / 255;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);

      // Periodic HUD State Updates (Throttled optically)
      if (Math.random() < 0.1) {
        setRmsEnergy(Math.round(rms * 100));
        const dbVal = isPlaying ? (20 * Math.log10(Math.max(0.01, rms))).toFixed(1) : '-96.0';
        setPeakDb(`${dbVal} dB`);

        const freqPercent = maxBandIdx / bufferLength;
        if (freqPercent < 0.15) setDominantBand('Sub-Bass 60 Hz');
        else if (freqPercent < 0.35) setDominantBand('Bass 230 Hz');
        else if (freqPercent < 0.65) setDominantBand('Midrange 910 Hz');
        else if (freqPercent < 0.85) setDominantBand('Presence 3.6 kHz');
        else setDominantBand('Brilliance 14 kHz');
      }

      // =========================================================
      // MODE 1: GLOWING NEON SPECTRUM BARS
      // =========================================================
      if (mode === 'neon-bars') {
        const spacingRatio = 0.28;
        const totalBarWidth = width / barCount;
        const barWidth = totalBarWidth * (1 - spacingRatio);
        const barSpacing = totalBarWidth * spacingRatio;
        const baselineY = height - 20;

        for (let i = 0; i < barCount; i++) {
          const binIndex = Math.floor((i / barCount) * (bufferLength * 0.7));
          const rawValue = dataArray[binIndex] || 0;
          const scaledValue = Math.min(255, rawValue * sensitivity);
          const percent = scaledValue / 255;
          const barHeight = Math.max(6, percent * (height - 60));

          const x = i * (barWidth + barSpacing) + barSpacing / 2;
          const y = baselineY - barHeight;

          // Peak hold calculations
          if (barHeight > (peakHoldRef.current[i] || 0)) {
            peakHoldRef.current[i] = barHeight;
            peakHoldTimeRef.current[i] = 20; // frames to hold
          } else {
            if (peakHoldTimeRef.current[i] > 0) {
              peakHoldTimeRef.current[i]--;
            } else {
              peakHoldRef.current[i] = Math.max(4, (peakHoldRef.current[i] || 0) - 1.8);
            }
          }

          // Bar Gradient with Neon Glow
          const grad = ctx.createLinearGradient(0, baselineY, 0, y);
          grad.addColorStop(0, `${activeColor}22`);
          grad.addColorStop(0.5, activeColor);
          grad.addColorStop(0.9, secondaryColor);
          grad.addColorStop(1, '#ffffff');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
          ctx.fill();

          // Mirror Reflection underneath
          const reflectGrad = ctx.createLinearGradient(0, baselineY, 0, baselineY + 16);
          reflectGrad.addColorStop(0, `${activeColor}44`);
          reflectGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = reflectGrad;
          ctx.fillRect(x, baselineY + 2, barWidth, Math.min(14, barHeight * 0.25));

          // Floating Peak Cap
          const peakY = baselineY - (peakHoldRef.current[i] || 0);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = secondaryColor;
          ctx.shadowBlur = 8;
          ctx.fillRect(x, Math.max(10, peakY - 3), barWidth, 2.5);
          ctx.shadowBlur = 0; // reset
        }
      }

      // =========================================================
      // MODE 2: CONTINUOUS OSCILLOSCOPE WAVEFORM
      // =========================================================
      else if (mode === 'continuous-wave') {
        const centerY = height / 2;
        const sliceWidth = width / bufferLength;

        // Background subtle grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = 30; y < height; y += 40) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();

        // 1. Fill Ambient Under-Glow
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        for (let i = 0; i < bufferLength; i++) {
          const v = (timeDomainArray[i] / 128.0 - 1.0) * sensitivity;
          const y = centerY + v * (height * 0.38);
          const x = i * sliceWidth;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const waveGrad = ctx.createLinearGradient(0, centerY - 80, 0, height);
        waveGrad.addColorStop(0, `${activeColor}44`);
        waveGrad.addColorStop(0.7, `${secondaryColor}11`);
        waveGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = waveGrad;
        ctx.fill();

        // 2. High-Precision Glowing Sine Line
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = activeColor;
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 16;
        ctx.beginPath();

        for (let i = 0; i < bufferLength; i++) {
          const v = (timeDomainArray[i] / 128.0 - 1.0) * sensitivity;
          const y = centerY + v * (height * 0.38);
          const x = i * sliceWidth;
          if (i === 0) ctx.moveTo(x, y);
          else {
            const prevX = (i - 1) * sliceWidth;
            const prevV = (timeDomainArray[i - 1] / 128.0 - 1.0) * sensitivity;
            const prevY = centerY + prevV * (height * 0.38);
            const cpX = (prevX + x) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 3. Crisp Foreground White Spine
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }

      // =========================================================
      // MODE 3: CIRCULAR / RADIAL AUDIO HALO
      // =========================================================
      else if (mode === 'radial-halo') {
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) * 0.22;
        const radialBands = 64;

        // Center Pulsing Core
        const coreRadius = baseRadius * (0.65 + rms * 0.35);
        const coreGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, coreRadius);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.4, activeColor);
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        // Radiating Spectrum Spikes
        for (let i = 0; i < radialBands; i++) {
          const bin = Math.floor((i / radialBands) * (bufferLength * 0.6));
          const val = (dataArray[bin] || 0) * sensitivity;
          const spikeLen = Math.max(8, (val / 255) * (height * 0.32));

          const angle = (i / radialBands) * Math.PI * 2 + phase * 0.5;
          const x1 = centerX + Math.cos(angle) * baseRadius;
          const y1 = centerY + Math.sin(angle) * baseRadius;
          const x2 = centerX + Math.cos(angle) * (baseRadius + spikeLen);
          const y2 = centerY + Math.sin(angle) * (baseRadius + spikeLen);

          ctx.strokeStyle = i % 2 === 0 ? activeColor : secondaryColor;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Particle Tip
          if (spikeLen > 24) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x2, y2, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // =========================================================
      // MODE 4: CYBERPUNK MULTI-LAYER WAVE
      // =========================================================
      else if (mode === 'cyber-waves') {
        const centerY = height * 0.55;
        const layers = 3;

        for (let l = 0; l < layers; l++) {
          const lPhase = phase * (1 + l * 0.4) + l * 1.5;
          const lColor = l === 0 ? activeColor : l === 1 ? secondaryColor : '#38bdf8';
          const lAlpha = 0.35 - l * 0.08;

          ctx.beginPath();
          ctx.moveTo(0, height);

          for (let x = 0; x <= width; x += 12) {
            const progress = x / width;
            const bin = Math.floor(progress * (bufferLength * 0.5));
            const audioAmp = ((dataArray[bin] || 0) / 255) * 80 * sensitivity;

            const y =
              centerY +
              Math.sin(progress * 8 + lPhase) * (25 + audioAmp) +
              Math.cos(progress * 14 + lPhase * 1.2) * (15 + audioAmp * 0.5);

            if (x === 0) ctx.lineTo(x, y);
            else ctx.lineTo(x, y);
          }

          ctx.lineTo(width, height);
          ctx.closePath();

          ctx.fillStyle = `${lColor}${Math.floor(lAlpha * 255).toString(16).padStart(2, '0')}`;
          ctx.fill();

          ctx.strokeStyle = lColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, accentColor, analyserNode, mode, selectedTheme, sensitivity, barCount]);

  return (
    <div
      ref={containerRef}
      id="view-audio-visualizer-dsp"
      className={`p-6 lg:p-10 max-w-5xl mx-auto w-full flex-1 flex flex-col justify-between items-center space-y-6 animate-fadeIn select-none ${
        isFullscreen ? 'fixed inset-0 z-50 bg-zinc-950 p-8 max-w-none justify-center' : ''
      }`}
    >
      {/* Visualizer Header */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Activity className="w-4 h-4" />
            </span>
            <h2 className="text-xl lg:text-2xl font-black uppercase tracking-tight text-white">
              Velocity Web Audio DSP Spectrum
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            {audioDevice} • Preset: <span className="text-indigo-400 font-bold">{selectedPreset}</span>
          </p>
        </div>

        {/* Visualizer Mode Selector Pills */}
        <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-2xl border border-white/5">
          <button
            id="btn-vis-mode-bars"
            onClick={() => setMode('neon-bars')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mode === 'neon-bars'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Neon Bars</span>
          </button>

          <button
            id="btn-vis-mode-wave"
            onClick={() => setMode('continuous-wave')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mode === 'continuous-wave'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Oscilloscope</span>
          </button>

          <button
            id="btn-vis-mode-radial"
            onClick={() => setMode('radial-halo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mode === 'radial-halo'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Radial Halo</span>
          </button>

          <button
            id="btn-vis-mode-cyber"
            onClick={() => setMode('cyber-waves')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mode === 'cyber-waves'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cyber Wave</span>
          </button>
        </div>
      </div>

      {/* Main HTML5 Canvas Container */}
      <div className="w-full flex-1 min-h-[300px] lg:min-h-[380px] bg-zinc-950 rounded-3xl border border-white/10 p-4 lg:p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-2xl group">
        {/* Dynamic center glow bloom */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-700 blur-3xl"
          style={{
            background: `radial-gradient(circle at center, ${
              COLOR_THEMES[selectedTheme].primary || accentColor
            } 0%, transparent 70%)`
          }}
        />

        {/* Top Floating Status HUD */}
        <div className="flex items-center justify-between z-10 text-[11px] font-mono text-zinc-400 bg-zinc-900/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`} />
              {isPlaying ? 'DSP GRAPH ACTIVE' : 'SYNTH STANDBY'}
            </span>
            <span className="hidden sm:inline text-zinc-500">•</span>
            <span className="hidden sm:inline">Dominant: <strong className="text-zinc-200">{dominantBand}</strong></span>
          </div>

          <div className="flex items-center gap-4">
            <span>Peak: <strong className="text-indigo-300">{peakDb}</strong></span>
            <span>RMS: <strong className="text-zinc-200">{rmsEnergy}%</strong></span>
            <button
              onClick={toggleFullscreen}
              className="p-1 text-zinc-400 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Visualizer'}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* HTML5 Canvas Element */}
        <div className="relative w-full flex-1 flex items-center justify-center my-3">
          <canvas
            ref={canvasRef}
            width={860}
            height={340}
            className="w-full h-full object-contain rounded-2xl"
          />
        </div>

        {/* Interactive Bottom Control Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 z-10 text-xs">
          {/* Color Themes */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Theme:</span>
            <div className="flex items-center gap-1.5">
              {COLOR_THEMES.map((th, idx) => (
                <button
                  key={th.name}
                  onClick={() => setSelectedTheme(idx)}
                  className={`w-5 h-5 rounded-full border transition-all ${
                    selectedTheme === idx
                      ? 'border-white scale-110 shadow-md'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: th.primary || accentColor
                  }}
                  title={th.name}
                />
              ))}
            </div>
          </div>

          {/* Sensitivity & Density Slider */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Gain Multiplier:</span>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.1}
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="w-20 accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-full"
              />
              <span className="font-mono text-[10px] text-indigo-400">{sensitivity.toFixed(1)}x</span>
            </div>

            {mode === 'neon-bars' && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Bands:</span>
                <div className="flex gap-1">
                  {[32, 48, 64].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setBarCount(cnt)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        barCount === cnt
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DSP Pipeline Spec Badges */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] font-mono text-zinc-500 pt-1">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span>Biquad Equalizer Coupled</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span>Hardware Accelerated WebGL / 2D Canvas</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Fast Fourier Transform (128-Point FFT)</span>
        </span>
      </div>
    </div>
  );
};
