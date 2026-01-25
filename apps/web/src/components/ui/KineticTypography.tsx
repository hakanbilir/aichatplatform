import React, { useState } from 'react';
import { Typography, TypographyProps } from '@mui/material';

export const KineticTypography: React.FC<TypographyProps> = ({ children, sx, ...props }) => {
  const [weight, setWeight] = useState(400);

  const handleMouseEnter = () => {
    setWeight(600);
  };

  const handleMouseLeave = () => {
    setWeight(400);
  };

  return (
    <Typography
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        transition: 'font-weight 0.3s ease',
        fontWeight: weight,
        fontVariationSettings: `'wght' ${weight}`,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Typography>
  );
};
