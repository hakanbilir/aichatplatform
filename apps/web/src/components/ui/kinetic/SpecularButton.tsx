import React, { useRef } from 'react';
import { Button, ButtonProps } from '@mui/material';

export const SpecularButton: React.FC<ButtonProps> = ({ children, className, sx, ...props }) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      btnRef.current.style.setProperty('--mouse-x', `${x}px`);
      btnRef.current.style.setProperty('--mouse-y', `${y}px`);
    }
  };

  return (
    <Button
      ref={btnRef}
      className={`specular-button ${className || ''}`}
      onMouseMove={handleMouseMove}
      sx={{
        ...sx,
        textTransform: 'none',
        borderRadius: '12px',
      }}
      {...props}
    >
      {children}
    </Button>
  );
};
