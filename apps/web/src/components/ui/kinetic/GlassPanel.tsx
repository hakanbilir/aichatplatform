import React from 'react';
import { Box, BoxProps } from '@mui/material';

import { useEcoMode } from '../../../hooks/useEcoMode';
import { useSpecular } from '../../../hooks/useSpecular';

interface GlassPanelProps extends BoxProps {
  refractive?: boolean;
  specular?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className,
  refractive,
  specular,
  sx,
  onMouseMove,
  ...props
}) => {
  const { isEcoMode } = useEcoMode();
  const { ref: specularRef, handleMouseMove: handleSpecularMove } = useSpecular<HTMLDivElement>();

  // Default to refractive unless eco mode is on. If refractive prop is explicitly provided, respect it but disable if eco mode is on.
  const isRefractive = (refractive ?? true) && !isEcoMode;
  const isSpecular = (specular ?? false) && !isEcoMode;

  const handleMouseMoveCombined = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSpecular) {
      handleSpecularMove(e);
    }
    if (onMouseMove) {
      onMouseMove(e);
    }
  };

  return (
    <Box
      ref={isSpecular ? specularRef : undefined}
      // Outer container handles layout and positioning
      // Add specular-button class if enabled
      className={`${isSpecular ? 'specular-button' : ''} ${className || ''}`}
      onMouseMove={handleMouseMoveCombined}
      sx={{
        position: 'relative',
        height: '100%', // Ensure it fills the grid cell
        display: 'flex',
        flexDirection: 'column',
        ...sx,
      }}
      {...props}
    >
      {/* Background Layer: Applies Glass Effect and Refraction (Distortion) */}
      <Box
        className="kinetic-glass-panel"
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          filter: isRefractive ? 'url(#refraction)' : undefined,
          pointerEvents: 'none', // Ensure background doesn't block interaction
          width: '100%',
          height: '100%',
          // Ensure border radius matches if overridden
          borderRadius: 'inherit',
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
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
