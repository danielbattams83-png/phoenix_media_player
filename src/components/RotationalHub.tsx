import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FolderOpen, Music2, SlidersHorizontal, Video } from 'lucide-react';

export type RotationalHubDestination = 'local-files' | 'spotify' | 'youtube' | 'equalizer';

interface HubCard {
  id: RotationalHubDestination;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface RotationalHubProps {
  className?: string;
  initialDestination?: RotationalHubDestination;
  onActivateMode?: (destination: RotationalHubDestination) => void;
  onSelectMode?: (destination: RotationalHubDestination) => void;
}

const HUB_CARDS: HubCard[] = [
  {
    id: 'local-files',
    title: 'Local Files',
    description: 'Browse and play your music library.',
    icon: <FolderOpen className="h-8 w-8" />,
    color: '#818cf8'
  },
  {
    id: 'spotify',
    title: 'Spotify',
    description: 'Listen to your Spotify library.',
    icon: <Music2 className="h-8 w-8" />,
    color: '#34d399'
  },
  {
    id: 'youtube',
    title: 'YouTube',
    description: 'Explore video and music on YouTube.',
    icon: <Video className="h-8 w-8" />,
    color: '#fb7185'
  },
  {
    id: 'equalizer',
    title: 'Equalizer',
    description: 'Tune your sound with audio settings.',
    icon: <SlidersHorizontal className="h-8 w-8" />,
    color: '#c084fc'
  }
];

const CARD_STEP_DEGREES = 90;
const CARD_RADIUS_PX = 250;

export const RotationalHub: React.FC<RotationalHubProps> = ({
  className = '',
  initialDestination = 'local-files',
  onActivateMode,
  onSelectMode
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const wheelResetTimer = useRef<number | undefined>(undefined);
  const wheelDelta = useRef(0);
  const initialIndex = Math.max(0, HUB_CARDS.findIndex((card) => card.id === initialDestination));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const activeIndexRef = useRef(initialIndex);

  const selectIndex = useCallback((index: number) => {
    const selectedIndex = (index + HUB_CARDS.length) % HUB_CARDS.length;
    activeIndexRef.current = selectedIndex;
    setActiveIndex(selectedIndex);
    onSelectMode?.(HUB_CARDS[selectedIndex].id);
  }, [onSelectMode]);

  const rotate = useCallback((step: number) => {
    selectIndex(activeIndexRef.current + step);
  }, [selectIndex]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      wheelDelta.current += event.deltaY;
      if (wheelResetTimer.current !== undefined) window.clearTimeout(wheelResetTimer.current);
      wheelResetTimer.current = window.setTimeout(() => {
        if (Math.abs(wheelDelta.current) >= 20) rotate(wheelDelta.current > 0 ? 1 : -1);
        wheelDelta.current = 0;
        wheelResetTimer.current = undefined;
      }, 70);
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', handleWheel);
      if (wheelResetTimer.current !== undefined) window.clearTimeout(wheelResetTimer.current);
    };
  }, [rotate]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      rotate(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      rotate(-1);
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const deltaX = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    if (Math.abs(deltaX) >= 40) rotate(deltaX < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const rotation = -activeIndex * CARD_STEP_DEGREES;

  return (
    <section className={`flex w-full flex-col items-center gap-6 py-8 ${className}`}>
      <div
        ref={viewportRef}
        tabIndex={0}
        role="region"
        aria-label="Rotational navigation hub. Use mouse wheel, left and right arrow keys, or swipe to rotate."
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative h-[380px] w-full max-w-[520px] overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950"
        style={{ perspective: '1000px', touchAction: 'pan-y' }}
      >
        <div
          className="absolute left-1/2 top-1/2 h-0 w-0"
          style={{
            transformStyle: 'preserve-3d',
            transform: `translate(-50%, -50%) rotateY(${rotation}deg)`,
            transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          {HUB_CARDS.map((card, index) => (
            <button
              key={card.id}
              type="button"
              aria-label={`${card.title}: ${card.description}`}
              aria-current={activeIndex === index ? 'true' : undefined}
              onFocus={() => {
                if (activeIndexRef.current !== index) selectIndex(index);
              }}
              onClick={() => {
                selectIndex(index);
                onActivateMode?.(card.id);
              }}
              className="absolute left-1/2 top-1/2 flex h-[260px] w-[min(76vw,300px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-[#11141c]/95 p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-colors hover:bg-[#191d29] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300"
              style={{
                transform: `translate(-50%, -50%) rotateY(${index * CARD_STEP_DEGREES}deg) translateZ(${CARD_RADIUS_PX}px)`,
                backfaceVisibility: 'hidden',
                borderColor: activeIndex === index ? `${card.color}80` : undefined,
                boxShadow: activeIndex === index ? `0 0 48px ${card.color}22, 0 24px 70px rgba(0,0,0,0.55)` : undefined
              }}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06]" style={{ color: card.color }}>
                {card.icon}
              </span>
              <span className="text-xl font-bold tracking-tight text-white">{card.title}</span>
              <span className="max-w-[220px] text-sm leading-relaxed text-zinc-400">{card.description}</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                {activeIndex === index ? 'Selected' : 'Open'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2" aria-label="Hub position">
        {HUB_CARDS.map((card, index) => (
          <button
            key={card.id}
            type="button"
            onClick={() => selectIndex(index)}
            aria-label={`Show ${card.title}`}
            aria-current={activeIndex === index ? 'true' : undefined}
            className={`h-2 rounded-full transition-all ${activeIndex === index ? 'w-6' : 'w-2 bg-white/20 hover:bg-white/40'}`}
            style={activeIndex === index ? { backgroundColor: card.color } : undefined}
          />
        ))}
      </div>
      <p className="text-[10px] text-zinc-600">Scroll, swipe, or use ← → to rotate</p>
    </section>
  );
};

export default RotationalHub;
