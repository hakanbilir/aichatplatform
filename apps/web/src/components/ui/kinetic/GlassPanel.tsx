import React from 'react';
import { Box } from '@mui/material';
import type { BoxProps } from '@mui/material';

interface GlassPanelProps extends BoxProps {
  refractive?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, className, refractive = false, sx, ...props }) => {
  return (
    <Box
      className={`kinetic-glass-panel ${className || ''}`}
      sx={{
        ...sx,
        filter: refractive ? 'url(#refraction)' : undefined,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};
