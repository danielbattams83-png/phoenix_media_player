import React, { useEffect, useRef } from 'react';

interface MagneticLogoProps {
  audioLevel?: number;
  className?: string;
  label?: string;
  size?: number;
}

const MAGNETIC_RADIUS = 150;
const MAX_PULL_DISTANCE = 24;
const POSITION_LERP = 0.12;
const STRETCH_LERP = 0.16;

interface PointerPosition {
  x: number;
  y: number;
}

interface LogoMotion {
  x: number;
  y: number;
  stretch: number;
}

export const MagneticLogo: React.FC<MagneticLogoProps> = ({
  audioLevel = 0,
  className = '',
  label = 'Phoenix Media Player',
  size = 36
}) => {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const logoRef = useRef<SVGSVGElement | null>(null);
  const pointerRef = useRef<PointerPosition>({ x: -1000, y: -1000 });
  const previousPointerRef = useRef<PointerPosition>({ x: -1000, y: -1000 });
  const hasPointerRef = useRef(false);
  const motionRef = useRef<LogoMotion>({ x: 0, y: 0, stretch: 0 });
  const audioLevelRef = useRef(0);
  const animateRef = useRef<(() => void) | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const logo = logoRef.current;
    const container = containerRef.current;
    if (!logo || !container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const animate = () => {
      frameRef.current = null;
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const pointer = pointerRef.current;
      const deltaX = pointer.x - centerX;
      const deltaY = pointer.y - centerY;
      const distance = Math.hypot(deltaX, deltaY);
      const proximity = distance < MAGNETIC_RADIUS ? 1 - distance / MAGNETIC_RADIUS : 0;
      const pull = proximity * 0.2;
      const targetX = Math.max(-MAX_PULL_DISTANCE, Math.min(MAX_PULL_DISTANCE, deltaX * pull));
      const targetY = Math.max(-MAX_PULL_DISTANCE, Math.min(MAX_PULL_DISTANCE, deltaY * pull));

      const pointerDeltaX = pointer.x - previousPointerRef.current.x;
      const pointerDeltaY = pointer.y - previousPointerRef.current.y;
      const pointerSpeed = Math.hypot(pointerDeltaX, pointerDeltaY);
      const targetStretch = Math.min(pointerSpeed / 180, 0.08) * proximity;

      previousPointerRef.current = { ...pointer };

      const motion = motionRef.current;
      motion.x += (targetX - motion.x) * POSITION_LERP;
      motion.y += (targetY - motion.y) * POSITION_LERP;
      motion.stretch += (targetStretch - motion.stretch) * STRETCH_LERP;

      const audioScale = 1 + audioLevelRef.current * 0.15;
      const scaleX = (1 + motion.stretch) * audioScale;
      const scaleY = (1 - motion.stretch) * audioScale;
      logo.style.transform = `translate3d(${motion.x.toFixed(2)}px, ${motion.y.toFixed(2)}px, 0) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;

      const isSettled = Math.abs(targetX - motion.x) < 0.05
        && Math.abs(targetY - motion.y) < 0.05
        && Math.abs(motion.stretch) < 0.001
        && pointerSpeed < 0.1;
      if (!isSettled || audioLevelRef.current > 0) frameRef.current = window.requestAnimationFrame(animate);
    };
    animateRef.current = animate;

    const handleMouseMove = (event: MouseEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
      if (!hasPointerRef.current) {
        previousPointerRef.current = { ...pointerRef.current };
        hasPointerRef.current = true;
      }
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      animateRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioLevelRef.current = Number.isFinite(audioLevel) ? Math.max(0, Math.min(1, audioLevel)) : 0;
    if (frameRef.current === null && animateRef.current) {
      frameRef.current = window.requestAnimationFrame(animateRef.current);
    }
  }, [audioLevel]);

  return (
    <span
      ref={containerRef}
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        ref={logoRef}
        width={size}
        height={size}
        viewBox="0 0 512 512"
        role="img"
        aria-label={label}
        className="block rounded-xl object-contain"
        style={{ transformOrigin: 'center', willChange: 'transform' }}
      >
        <image href="/phoenix_logo.png" width="512" height="512" preserveAspectRatio="xMidYMid meet" />
      </svg>
    </span>
  );
};

export default MagneticLogo;
