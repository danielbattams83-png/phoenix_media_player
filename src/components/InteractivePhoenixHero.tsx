import React, { useEffect, useId, useRef } from 'react';

interface InteractivePhoenixHeroProps {
  audioLevel?: number;
  className?: string;
  size?: number;
}

interface Point {
  x: number;
  y: number;
}

interface Motion {
  x: number;
  y: number;
  intensity: number;
}

const VIEWBOX_SIZE = 1773;
const LERP = 0.12;

export const InteractivePhoenixHero: React.FC<InteractivePhoenixHeroProps> = ({
  audioLevel = 0,
  className = '',
  size = 72
}) => {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement | null>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const cursorGradientRef = useRef<SVGRadialGradientElement | null>(null);
  const pointerRef = useRef<Point>({ x: 0.5, y: 0.5 });
  const pointerInsideRef = useRef(false);
  const motionRef = useRef<Motion>({ x: 0.5, y: 0.5, intensity: 0 });
  const audioLevelRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const scheduleAnimationRef = useRef<(() => void) | null>(null);
  const generatedId = useId();
  const filterId = `phoenix-liquid-${generatedId.replace(/:/g, '')}`;
  const maskId = `phoenix-cursor-mask-${generatedId.replace(/:/g, '')}`;
  const gradientId = `phoenix-cursor-gradient-${generatedId.replace(/:/g, '')}`;

  useEffect(() => {
    const container = containerRef.current;
    const turbulence = turbulenceRef.current;
    const displacement = displacementRef.current;
    const cursorGradient = cursorGradientRef.current;
    if (!container || !turbulence || !displacement || !cursorGradient) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const animate = () => {
      animationFrameRef.current = null;
      const motion = motionRef.current;
      const pointer = pointerRef.current;
      const audio = audioLevelRef.current;
      const targetX = pointerInsideRef.current ? pointer.x : 0.5;
      const targetY = pointerInsideRef.current ? pointer.y : 0.5;
      const targetIntensity = Math.max(pointerInsideRef.current ? 1 : 0, audio);

      motion.x += (targetX - motion.x) * LERP;
      motion.y += (targetY - motion.y) * LERP;
      motion.intensity += (targetIntensity - motion.intensity) * LERP;

      const intensity = Math.max(0, Math.min(1, motion.intensity));
      const audioPulse = Math.min(1, audio);
      const distortionScale = intensity * 16 + audioPulse * 2;
      const baseFrequency = 0.04 + intensity * 0.012 + audioPulse * 0.006;
      const mouseOffsetX = (motion.x - 0.5) * 2;
      const mouseOffsetY = (motion.y - 0.5) * 2;
      const hueShift = (mouseOffsetX * 58 + mouseOffsetY * 82) * intensity;

      turbulence.setAttribute('baseFrequency', baseFrequency.toFixed(4));
      displacement.setAttribute('scale', distortionScale.toFixed(2));
      cursorGradient.setAttribute('cx', (motion.x * VIEWBOX_SIZE).toFixed(1));
      cursorGradient.setAttribute('cy', (motion.y * VIEWBOX_SIZE).toFixed(1));

      container.style.setProperty('--mouse-x', `${(motion.x * 100).toFixed(2)}%`);
      container.style.setProperty('--mouse-y', `${(motion.y * 100).toFixed(2)}%`);
      container.style.setProperty('--hue-shift', `${hueShift.toFixed(2)}deg`);
      container.style.setProperty('--glow-x', `${(mouseOffsetX * 8).toFixed(2)}px`);
      container.style.setProperty('--glow-y', `${(mouseOffsetY * 8).toFixed(2)}px`);
      container.style.setProperty('--glow-blur', `${(12 + intensity * 18 + audioPulse * 20).toFixed(2)}px`);
      container.style.setProperty('--effect-opacity', `${Math.min(1, intensity * 0.9 + audioPulse * 0.35).toFixed(3)}`);

      const isSettled = Math.abs(targetX - motion.x) < 0.001
        && Math.abs(targetY - motion.y) < 0.001
        && Math.abs(targetIntensity - motion.intensity) < 0.001;
      if (!isSettled || audio > 0.01) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
      }
    };

    const scheduleAnimation = () => {
      if (animationFrameRef.current === null) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
      }
    };
    scheduleAnimationRef.current = scheduleAnimation;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerInsideRef.current = true;
      pointerRef.current = {
        x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
      };
      scheduleAnimation();
    };

    const handlePointerLeave = () => {
      pointerInsideRef.current = false;
      scheduleAnimation();
    };

    container.addEventListener('pointermove', handlePointerMove, { passive: true });
    container.addEventListener('pointerleave', handlePointerLeave);
    scheduleAnimation();

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      scheduleAnimationRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioLevelRef.current = Number.isFinite(audioLevel)
      ? Math.max(0, Math.min(1, audioLevel))
      : 0;
    scheduleAnimationRef.current?.();
  }, [audioLevel]);

  return (
    <span
      ref={containerRef}
      className={`interactive-phoenix-hero inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: `min(${size}px, 72vw)`, height: `min(${size}px, 72vw)` }}
      role="img"
      aria-label="Interactive Phoenix logo"
    >
      <svg
        className="interactive-phoenix-hero__art"
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        aria-hidden="true"
      >
        <defs>
          <filter
            id={filterId}
            x="-15%"
            y="-15%"
            width="130%"
            height="130%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              ref={turbulenceRef}
              type="fractalNoise"
              baseFrequency="0.04"
              numOctaves="2"
              seed="4"
              result="liquidNoise"
            />
            <feDisplacementMap
              ref={displacementRef}
              in="SourceGraphic"
              in2="liquidNoise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <radialGradient
            id={gradientId}
            ref={cursorGradientRef}
            gradientUnits="userSpaceOnUse"
            cx={VIEWBOX_SIZE / 2}
            cy={VIEWBOX_SIZE / 2}
            r={VIEWBOX_SIZE * 0.1}
          >
            <stop offset="0" stopColor="white" stopOpacity="1" />
            <stop offset="0.72" stopColor="white" stopOpacity="1" />
            <stop offset="0.92" stopColor="white" stopOpacity="0.35" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id={maskId}>
            <rect width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} fill={`url(#${gradientId})`} />
          </mask>
        </defs>
        <image
          href="/phoenix-logo.svg"
          width={VIEWBOX_SIZE}
          height={VIEWBOX_SIZE}
          preserveAspectRatio="xMidYMid meet"
        />
        <image
          href="/phoenix-logo.svg"
          width={VIEWBOX_SIZE}
          height={VIEWBOX_SIZE}
          preserveAspectRatio="xMidYMid meet"
          filter={`url(#${filterId})`}
          mask={`url(#${maskId})`}
          className="interactive-phoenix-hero__liquid"
        />
      </svg>
    </span>
  );
};

export default InteractivePhoenixHero;
