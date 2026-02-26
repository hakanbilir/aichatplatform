import React, { useState } from 'react';
import {
  Box,
  CardContent,
  CardHeader,
  Typography,
  IconButton,
  Collapse,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import { GlassPanel } from '../ui/kinetic/GlassPanel';

// Reusable panel/card container with header, actions, and collapsible support
// Başlık, eylemler ve daraltılabilir destekle yeniden kullanılabilir panel/kart konteyneri

export interface PanelProps {
  // Panel title / Panel başlığı
  title: string;
  // Panel subtitle / Panel alt başlığı
  subtitle?: string;
  // Panel content / Panel içeriği
  children: React.ReactNode;
  // Header actions / Başlık eylemleri
  actions?: React.ReactNode;
  // Collapsible / Daraltılabilir
  collapsible?: boolean;
  // Initially expanded / Başlangıçta genişletilmiş
  defaultExpanded?: boolean;
  // Custom sx props / Özel sx prop'ları
  sx?: object;
  // Custom header sx / Özel başlık sx
  headerSx?: object;
  // Refractive effect
  refractive?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  children,
  actions,
  collapsible = false,
  defaultExpanded = true,
  sx,
  headerSx,
  refractive = false,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    if (collapsible) {
      setExpanded(!expanded);
    }
  };

  return (
    <GlassPanel
      refractive={refractive}
      sx={{
        transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme as any).custom?.elevation?.[3] || '0 10px 20px rgba(0,0,0,0.19)',
        },
        ...sx,
      }}
    >
      <CardHeader
        title={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box flex={1} minWidth={0}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: '0.75rem', mt: 0.5, display: 'block' }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              {actions}
              {collapsible && (
                <IconButton
                  size="small"
                  onClick={handleToggle}
                  sx={{
                    color: 'text.secondary',
                    transition: 'transform 200ms ease',
                    transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)',
                  }}
                >
                  {expanded ? (
                    <ExpandLessIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                </IconButton>
              )}
            </Box>
          </Box>
        }
        sx={{
          pb: 1,
          '& .MuiCardHeader-content': {
            width: '100%',
          },
          ...headerSx,
        }}
      />
      <Collapse in={expanded} timeout={300}>
        <CardContent sx={{ pt: 0, '&:last-child': { pb: 2 } }}>{children}</CardContent>
      </Collapse>
    </GlassPanel>
  );
};
