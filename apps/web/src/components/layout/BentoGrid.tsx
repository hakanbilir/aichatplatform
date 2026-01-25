import React from 'react';
import { Box, BoxProps } from '@mui/material';
import '../../theme/theme2026.css';

interface BentoGridProps extends BoxProps {
  children: React.ReactNode;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, sx, className, ...props }) => {
  return (
    <Box
      className={`bento-grid ${className || ''}`}
      sx={{
        // Fallback or override styles
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};
