import React, { useRef, useEffect } from 'react';
import { Typography, TypographyProps } from '@mui/material';

import { useEcoMode } from '../../../hooks/useEcoMode';

export const KineticTypography: React.FC<TypographyProps & { component?: React.ElementType }> = ({ children, className, ...props }) => {
  const textRef = useRef<HTMLElement>(null);
  const { isEcoMode } = useEcoMode();

  useEffect(() => {
    if (isEcoMode) return;

    let frameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (frameId) cancelAnimationFrame(frameId);

      frameId = requestAnimationFrame(() => {
        if (textRef.current) {
          const rect = textRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dist = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));

          // Map distance to font weight (closer = heavier)
          // Max weight 700, min 300. Max influence distance 500px.
          const maxDist = 500;
          const weight = Math.max(300, 700 - (Math.min(dist, maxDist) / maxDist) * 400);

          textRef.current.style.setProperty('--mouse-weight', `${weight}`);
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [isEcoMode]);

  return (
    <Typography
      ref={textRef}
      className={`kinetic-typography ${className || ''}`}
      {...props}
    >
      {children}
    </Typography>
  );
};
