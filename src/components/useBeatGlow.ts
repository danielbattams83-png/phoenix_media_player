import { useEffect, type RefObject } from 'react';

export function useBeatGlow(
  rootRef: RefObject<HTMLDivElement | null>,
  analyserRef: RefObject<AnalyserNode | null>,
  isPlaying: boolean,
  isMuted: boolean,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let strength = 0;
    let lastSample = 0;
    let data: Uint8Array<ArrayBuffer> | undefined;
    let waveform: Uint8Array<ArrayBuffer> | undefined;

    const reset = () => root.style.setProperty('--beat-strength', '0');
    const render = (now: number) => {
      if (document.hidden || motion.matches) {
        reset();
        frame = requestAnimationFrame(render);
        return;
      }
      if (now - lastSample >= 32) {
        const elapsed = Math.min(100, now - lastSample);
        lastSample = now;
        const analyser = analyserRef.current;
        let target = 0;
        if (analyser && analyser.context.state === 'running') {
          if (!data || data.length !== analyser.frequencyBinCount) data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          const binHz = analyser.context.sampleRate / analyser.fftSize;
          const first = Math.max(1, Math.ceil(40 / binHz));
          const end = Math.min(data.length, Math.max(first + 1, Math.ceil(220 / binHz)));
          let bass = 0;
          for (let i = first; i < end; i++) bass += (data[i] / 255) ** 2;
          if (!waveform || waveform.length !== analyser.fftSize) waveform = new Uint8Array(analyser.fftSize);
          analyser.getByteTimeDomainData(waveform);
          let energy = 0;
          for (const sample of waveform) energy += ((sample - 128) / 128) ** 2;
          target = Math.min(1, Math.sqrt(bass / (end - first)) * Math.sqrt(energy / waveform.length) * 4);
        }
        const smoothing = 1 - Math.exp(-elapsed / (target > strength ? 45 : 190));
        strength += (target - strength) * smoothing;
        root.style.setProperty('--beat-strength', strength.toFixed(3));
      }
      frame = requestAnimationFrame(render);
    };

    reset();
    if (isPlaying && !isMuted) frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); reset(); };
  }, [rootRef, analyserRef, isPlaying, isMuted]);
}
