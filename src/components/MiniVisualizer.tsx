import React, { useEffect, useRef } from 'react';

interface MiniVisualizerProps {
  isPlaying: boolean;
  accentColor: string;
  analyserNode: AnalyserNode | null;
  className?: string;
  bars?: number;
}

export const MiniVisualizer: React.FC<MiniVisualizerProps> = ({
  isPlaying,
  accentColor,
  analyserNode,
  className = 'w-16 h-6',
  bars = 8
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);
    let phase = 0;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      phase += 0.05;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (analyserNode && isPlaying) {
        analyserNode.getByteFrequencyData(dataArray);
      } else {
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = isPlaying
            ? Math.floor(Math.sin(phase + i * 0.4) * 35 + 45 + Math.random() * 20)
            : 6;
        }
      }

      const totalBarWidth = width / bars;
      const barWidth = totalBarWidth * 0.65;
      const spacing = totalBarWidth * 0.35;

      for (let i = 0; i < bars; i++) {
        const binIndex = Math.floor((i / bars) * (bufferLength * 0.5));
        const val = dataArray[binIndex] || 0;
        const percent = isPlaying ? Math.max(0.15, val / 255) : 0.1;
        const barHeight = Math.max(3, percent * height);
        const x = i * (barWidth + spacing) + spacing / 2;
        const y = height - barHeight;

        const grad = ctx.createLinearGradient(0, height, 0, y);
        grad.addColorStop(0, accentColor || '#6366f1');
        grad.addColorStop(1, '#ffffff');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        ctx.fill();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, accentColor, analyserNode, bars]);

  return (
    <canvas
      ref={canvasRef}
      width={64}
      height={24}
      className={`${className} pointer-events-none`}
    />
  );
};
