import React, { useRef, useEffect } from 'react';
import { Typography, TypographyProps } from '@mui/material';

export const KineticTypography: React.FC<TypographyProps> = ({ children, style, ...props }) => {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate distance from center of text
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const maxDist = Math.max(rect.width, rect.height);

      // Map distance to weight (closer = bolder)
      // Base 400, max 700
      const weight = 700 - Math.min((dist / maxDist) * 300, 300);

      el.style.setProperty('--font-weight', String(weight));
    };

    // Optimization: only listen when hovering nearby
    el.addEventListener('mousemove', handleMouseMove);
    return () => el.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <Typography
      ref={textRef}
      style={{
        ...style,
        fontVariationSettings: "'wght' var(--font-weight, 400)",
        transition: 'font-variation-settings 0.2s ease-out',
      }}
      {...props}
    >
      {children}
    </Typography>
  );
};
