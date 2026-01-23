import React from 'react';
import { Box, BoxProps } from '@mui/material';

export const BentoGrid: React.FC<BoxProps> = ({ children, className, sx, ...props }) => {
  return (
    <Box
      className={`bento-grid ${className || ''}`}
      sx={{
        width: '100%',
        height: '100%',
        ...sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
};
