import React from 'react';
import { Box, BoxProps } from '@mui/material';

interface GlassPanelProps extends BoxProps {
  refractive?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, className, refractive = false, sx, ...props }) => {
  return (
    <Box
      // Outer container handles layout and positioning
      sx={{
        position: 'relative',
        ...sx,
      }}
      {...props}
    >
      {/* Background Layer: Applies Glass Effect and Refraction (Distortion) */}
      <Box
        className={`kinetic-glass-panel ${className || ''}`}
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          filter: refractive ? 'url(#refraction)' : undefined,
          pointerEvents: 'none', // Ensure background doesn't block interaction
          // Ensure the background layer takes the shape
          width: '100%',
          height: '100%',
        }}
      />

      {/* Content Layer: Stays sharp and interactive */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column' // Assume column layout for content usually
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
