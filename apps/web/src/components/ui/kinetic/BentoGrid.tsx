import React from 'react';
import { Box, BoxProps } from '@mui/material';

export const BentoGrid: React.FC<BoxProps> = ({ children, className, ...props }) => {
  return (
    <Box className={`bento-grid ${className || ''}`} {...props}>
      {children}
    </Box>
  );
};
