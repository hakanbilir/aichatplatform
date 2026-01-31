import React from 'react';
import { Paper, PaperProps } from '@mui/material';
import { useEcoMode } from '../../../hooks/useEcoMode';

interface GlassPanelProps extends PaperProps {
  variant?: 'default' | 'heavy';
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, variant = 'default', sx, ...props }) => {
  const { ecoMode } = useEcoMode();

  const glassStyles = ecoMode ? {
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
  } : {
      bgcolor: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: variant === 'heavy' ? 'blur(50px) saturate(200%)' : 'blur(30px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
      backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
  };

  return (
    <Paper
      className="kinetic-glass"
      sx={{
        borderRadius: '28px',
        ...glassStyles,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Paper>
  );
};
