import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  IconButton,
  Collapse,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useEcoMode } from '../EcoModeContext';

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
}) => {
  const theme = useTheme();
  const { isEcoMode } = useEcoMode();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    if (collapsible) {
      setExpanded(!expanded);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEcoMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <Card
      className={!isEcoMode ? 'glass-panel' : ''}
      onMouseMove={handleMouseMove}
      sx={{
        // Theme2026 overrides handled by CSS class, but we keep transitions and hover for non-glass or mix
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
              <Typography variant="h6" className="kinetic-text" sx={{ fontWeight: 600, fontSize: '1rem' }}>
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
                  data-ai-action="toggle-panel"
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
    </Card>
  );
};

