/**
 * Audio Synthesizer & Audio File Data Generator
 * Generates playable rich synthesized audio blobs so mock tracks play real sound
 * using standard Web Audio API and AudioContext offline rendering.
 */

// Helper to encode AudioBuffer to a standard 16-bit PCM WAV Blob
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF chunk descriptor
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  // FMT sub-chunk
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // 16 for PCM
  setUint16(1); // Linear quantization (PCM)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // bits per sample

  // data sub-chunk
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([outBuffer], { type: 'audio/wav' });
}

/**
 * Creates a rich musical loop for a given genre style
 */
export async function generateSynthesizedTrackBlob(style: 'synthwave' | 'ambient' | 'jazz' | 'piano' | 'cyberpunk' | 'drone', durationSeconds: number = 30): Promise<string> {
  const sampleRate = 44100;
  const length = sampleRate * durationSeconds;
  const offlineCtx = new (window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext)(
    2,
    length,
    sampleRate
  );

  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.4, 0);
  masterGain.connect(offlineCtx.destination);

  // Subtle master reverb / delay simulation
  const delay = offlineCtx.createDelay();
  delay.delayTime.setValueAtTime(0.35, 0);
  const delayGain = offlineCtx.createGain();
  delayGain.gain.setValueAtTime(0.25, 0);
  masterGain.connect(delay);
  delay.connect(delayGain);
  delayGain.connect(masterGain);

  if (style === 'synthwave') {
    // Synthwave Arpeggio Bass & Lead (F#m - D - A - E)
    const chords = [
      [185.0, 220.0, 277.18, 369.99], // F#m
      [146.83, 220.0, 293.66, 369.99], // D
      [220.0, 277.18, 329.63, 440.0], // A
      [164.81, 246.94, 329.63, 415.3] // E
    ];

    const stepTime = 0.25;
    for (let t = 0; t < durationSeconds; t += stepTime) {
      const chordIdx = Math.floor(t / 4) % chords.length;
      const noteIdx = Math.floor(t / stepTime) % 4;
      const freq = chords[chordIdx][noteIdx];

      // Bass saw
      const osc = offlineCtx.createOscillator();
      const oscGain = offlineCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq / 2, t);

      // Low pass filter with pluck envelope
      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.frequency.exponentialRampToValueAtTime(300, t + stepTime * 0.8);

      oscGain.gain.setValueAtTime(0.3, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + stepTime * 0.95);

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(t);
      osc.stop(t + stepTime);
    }
  } else if (style === 'ambient' || style === 'drone') {
    // Ethereal lush drone chords with slow LFO pulse
    const rootNotes = [110.0, 164.81, 220.0, 277.18, 329.63, 440.0];
    rootNotes.forEach((freq, idx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, 0);

      // Slow drift
      osc.frequency.linearRampToValueAtTime(freq * 1.01, durationSeconds / 2);
      osc.frequency.linearRampToValueAtTime(freq, durationSeconds);

      gain.gain.setValueAtTime(0.15 / (idx + 1), 0);
      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(0);
      osc.stop(durationSeconds);
    });
  } else if (style === 'jazz') {
    // Warm jazz Rhodes 7th chords
    const chordFrequencies = [
      [174.61, 220.0, 261.63, 329.63], // FM7
      [146.83, 196.0, 246.94, 293.66], // G7
      [164.81, 196.0, 246.94, 293.66], // Em7
      [220.0, 261.63, 329.63, 392.0] // Am7
    ];
    chordFrequencies.forEach((chord, chordIdx) => {
      const startTime = chordIdx * 3.5;
      if (startTime < durationSeconds) {
        chord.forEach((freq) => {
          const osc = offlineCtx.createOscillator();
          const gain = offlineCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, Math.min(durationSeconds, startTime + 3.2));

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(startTime);
          osc.stop(Math.min(durationSeconds, startTime + 3.4));
        });
      }
    });
  } else if (style === 'piano') {
    // Neoclassical gentle piano arpeggios
    const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 369.99, 440.0, 587.33];
    const step = 0.5;
    for (let t = 0; t < durationSeconds; t += step) {
      const noteIdx = Math.floor(t / step) % notes.length;
      const freq = notes[noteIdx];
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(Math.min(durationSeconds, t + 1.3));
    }
  } else {
    // Cyberpunk pulsating bassline
    const step = 0.2;
    for (let t = 0; t < durationSeconds; t += step) {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + step * 0.9);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + step);
    }
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const blob = audioBufferToWavBlob(renderedBuffer);
  return URL.createObjectURL(blob);
}
