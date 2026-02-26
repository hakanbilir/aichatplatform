'use client';

import React, { useRef, useEffect } from 'react';

import { useEcoMode } from '../../../hooks/useEcoMode';

interface KineticTypographyProps extends React.HTMLAttributes<HTMLElement> {
  component?: React.ElementType;
}

export const KineticTypography: React.FC<KineticTypographyProps> = ({
  children,
  className,
  component: Component = 'p',
  ...props
}) => {
  const textRef = useRef<HTMLElement>(null);
  const { isEcoMode } = useEcoMode();

  useEffect(() => {
    if (isEcoMode) return;

    let frameId: number;
    let isIntersecting = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isIntersecting) return;

      if (frameId) cancelAnimationFrame(frameId);

      frameId = requestAnimationFrame(() => {
        if (textRef.current) {
          const rect = textRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const dist = Math.sqrt(
            Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2),
          );

          const maxDist = 500;
          const weight = Math.max(300, 700 - (Math.min(dist, maxDist) / maxDist) * 400);

          textRef.current.style.setProperty('--mouse-weight', `${weight}`);
        }
      });
    };

    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      if (entry.isIntersecting) {
        window.addEventListener('mousemove', handleMouseMove);
      } else {
        window.removeEventListener('mousemove', handleMouseMove);
        if (frameId) cancelAnimationFrame(frameId);
      }
    });

    if (textRef.current) {
      observer.observe(textRef.current);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [isEcoMode]);

  return (
    <Component
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={textRef as any}
      className={`kinetic-typography ${className || ''}`}
      {...props}
    >
      {children}
    </Component>
  );
};
