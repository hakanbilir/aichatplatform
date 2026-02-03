import React from 'react';
import { Box } from '@mui/material';
import type { BoxProps } from '@mui/material';

export const BentoGrid: React.FC<BoxProps> = ({ children, className, ...props }) => {
  return (
    <Box className={`bento-grid ${className || ''}`} {...props}>
      {children}
    </Box>
  );
};
