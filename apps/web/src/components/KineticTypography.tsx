import React, { useRef, useEffect } from 'react';
import { Typography, TypographyProps } from '@mui/material';

export const KineticTypography: React.FC<TypographyProps> = ({ children, className, ...props }) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));

      // Calculate weight based on distance (closer = heavier)
      // Max weight 700, min 400. Dist range 0 to 500px.
      const maxDist = 500;
      const weight = Math.max(400, 700 - (Math.min(dist, maxDist) / maxDist) * 300);

      ref.current.style.setProperty('--mouse-dist', String(weight));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <Typography
      ref={ref}
      className={`kinetic-text ${className || ''}`}
      {...props}
    >
      {children}
    </Typography>
  );
};
