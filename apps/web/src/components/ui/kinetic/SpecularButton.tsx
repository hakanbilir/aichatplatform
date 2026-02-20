import React, { useRef } from 'react';
import { Button, ButtonProps } from '@mui/material';

interface SpecularButtonProps extends ButtonProps {
  /**
   * Action identifier for AI agents (e.g., 'login', 'submit', 'regenerate').
   * Renders as data-ai-action attribute.
   */
  aiAction?: string;
}

export const SpecularButton: React.FC<SpecularButtonProps> = ({
  children,
  className,
  sx,
  aiAction,
  ...props
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      btnRef.current.style.setProperty('--local-x', `${x}px`);
      btnRef.current.style.setProperty('--local-y', `${y}px`);
    }
  };

  return (
    <Button
      ref={btnRef}
      className={`specular-button ${className || ''}`}
      onMouseMove={handleMouseMove}
      data-ai-action={aiAction}
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
