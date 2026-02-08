import React from 'react';
import { Box, BoxProps } from '@mui/material';

import { useEcoMode } from '../../../hooks/useEcoMode';

interface GlassPanelProps extends BoxProps {
  refractive?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, className, refractive, sx, ...props }) => {
  const { isEcoMode } = useEcoMode();

  // Default to refractive unless eco mode is on. If refractive prop is explicitly provided, respect it but disable if eco mode is on.
  const isRefractive = (refractive ?? true) && !isEcoMode;

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
          filter: isRefractive ? 'url(#refraction)' : undefined,
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
