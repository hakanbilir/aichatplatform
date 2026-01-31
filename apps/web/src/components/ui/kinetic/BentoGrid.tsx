import React from 'react';
import { Box, BoxProps } from '@mui/material';

export const BentoGrid: React.FC<BoxProps> = ({ children, sx, ...props }) => (
  <Box
    className="bento-grid"
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, // 12-column grid for flexibility
      gap: '24px',
      ...sx,
    }}
    {...props}
  >
    {children}
  </Box>
);

interface BentoItemProps extends BoxProps {
  colSpan?: number;
  rowSpan?: number;
}

export const BentoItem: React.FC<BentoItemProps> = ({ children, colSpan = 3, rowSpan = 1, sx, ...props }) => (
  <Box
    sx={{
      gridColumn: { xs: 'span 12', md: `span ${colSpan}` },
      gridRow: `span ${rowSpan}`,
      ...sx
    }}
    {...props}
  >
    {children}
  </Box>
);
