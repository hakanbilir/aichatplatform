import React, { useRef } from 'react';
import { Button, ButtonProps } from '@mui/material';

export const SpecularButton: React.FC<ButtonProps> = ({ children, className, sx, ...props }) => {
  const ref = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ref.current.style.setProperty('--mouse-x', `${x}px`);
    ref.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <Button
      ref={ref}
      className={`specular-button ${className || ''}`}
      onMouseMove={handleMouseMove}
      sx={{
        textTransform: 'none',
        borderRadius: 999,
        ...sx
      }}
      {...props}
    >
      {children}
    </Button>
  );
};
