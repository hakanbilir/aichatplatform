import React, { useRef } from 'react';
import { Button, ButtonProps } from '@mui/material';

export const SpecularButton: React.FC<ButtonProps> = ({ children, sx, onMouseMove, ...props }) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      btnRef.current.style.setProperty('--mouse-x', `${x}px`);
      btnRef.current.style.setProperty('--mouse-y', `${y}px`);
    }
    if (onMouseMove) onMouseMove(e);
  };

  return (
    <Button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      data-ai-action="click"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 'var(--mouse-y)',
          left: 'var(--mouse-x)',
          width: '100px',
          height: '100px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.2s',
        },
        '&:hover::before': {
          opacity: 1,
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
};
