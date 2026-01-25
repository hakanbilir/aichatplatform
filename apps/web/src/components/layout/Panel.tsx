import React from 'react';
import { Box, BoxProps } from '@mui/material';
import '../../theme/theme2026.css';

interface PanelProps extends BoxProps {
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ children, sx, className, ...props }) => {
  return (
    <Box
      className={`liquid-glass ${className || ''}`}
      sx={{
        p: 3,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};
