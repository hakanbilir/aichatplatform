import React, { useRef } from 'react';
import { Button, ButtonProps } from '@mui/material';

export const SpecularButton: React.FC<ButtonProps> = ({ children, sx, ...props }) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;

    const rect = btnRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    btnRef.current.style.setProperty('--mouse-x', `${x}%`);
    btnRef.current.style.setProperty('--mouse-y', `${y}%`);
  };

  return (
    <Button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      className="specular-highlight"
      data-ai-action="true" // 2026 Standard
      sx={{
        borderRadius: '28px', // Kinetic standard
        textTransform: 'none',
        position: 'relative',
        overflow: 'hidden',
        ...sx
      }}
      {...props}
    >
      {children}
    </Button>
  );
};
