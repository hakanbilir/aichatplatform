// apps/web/src/chat/ToolsPanel.tsx

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TerminalIcon from '@mui/icons-material/Terminal';
import { useToolsPanel } from './useToolsPanel';

export interface ToolsPanelProps {
  open: boolean;
  onClose: () => void;
  conversationId: string | null;
  orgId: string | null;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({ open, onClose, conversationId, orgId }) => {
  const { t } = useTranslation('chat');
  const { tools, loadingTools, toolsError, runs, executing, executeError, runTool } = useToolsPanel(
    conversationId,
    orgId,
  );

  const [selectedToolName, setSelectedToolName] = useState<string | null>(null);
  const [argsJson, setArgsJson] = useState<string>('{}');

  const selectedTool = useMemo(() => tools.find((t) => t.name === selectedToolName) || null, [tools, selectedToolName]);

  const lastRun = runs[0] ?? null;

  const handleSelectTool = (name: string) => {
    setSelectedToolName(name);
    setArgsJson('{}');
  };

  const handleRun = async () => {
    if (!selectedToolName) return;
    await runTool(selectedToolName, argsJson);
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          height: 420,
          background:
            'radial-gradient(circle at top left, rgba(8,47,73,0.9), transparent 60%), radial-gradient(circle at bottom right, rgba(88,28,135,0.85), rgba(15,23,42,0.96))',
          color: 'rgba(241,245,249,0.98)',
        },
      }}
    >
      <Box display="flex" flexDirection="column" height="100%">
        <Box display="flex" alignItems="center" justifyContent="space-between" px={2} py={1.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <TerminalIcon fontSize="small" />
            <Box>
              <Typography variant="subtitle1">{t('tools.panel')}</Typography>
              <Typography variant="caption" color="rgba(148,163,184,0.95)">
                {t('tools.description')}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {loadingTools && (
              <Typography variant="caption" color="rgba(148,163,184,0.9)">
                {t('tools.loading')}
              </Typography>
            )}
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(51,65,85,0.9)' }} />

        <Box flex={1} display="flex" minHeight={0}>
          {/* Tools list */}
          <Box
            sx={{
              width: 260,
              borderRight: '1px solid rgba(30,64,175,0.8)',
              display: 'flex',
              flexDirection: 'column',
              p: 1.5,
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.08 }}>
                {t('tools.panel')}
              </Typography>
              <Tooltip title={t('tools.reload')}>
                <span>
                  <IconButton
                    size="small"
                    onClick={undefined}
                    disabled
                    sx={{ opacity: 0.3, cursor: 'default' }}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            {toolsError && (
              <Typography variant="caption" color="error" mb={1}>
                {toolsError}
              </Typography>
            )}

            {tools.length === 0 && !loadingTools && (
              <Typography variant="body2" color="rgba(148,163,184,0.95)">
                {t('tools.noTools')}
              </Typography>
            )}

            <List dense disablePadding sx={{ overflowY: 'auto', flex: 1 }}>
              {tools.map((tool) => (
                <ListItemButton
                  key={tool.name}
                  selected={tool.name === selectedToolName}
                  onClick={() => handleSelectTool(tool.name)}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.5,
                    '&.Mui-selected': {
                      background: 'linear-gradient(90deg, rgba(59,130,246,0.45), rgba(45,212,191,0.35))',
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(30,64,175,0.6)',
                    },
                  }}
                >
                  <ListItemText
                    primary={tool.name}
                    secondary={tool.description}
                    primaryTypographyProps={{
                      noWrap: true,
                      fontSize: 13,
                    }}
                    secondaryTypographyProps={{
                      noWrap: true,
                      fontSize: 11,
                      color: 'rgba(148,163,184,0.95)',
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>

          {/* Right side: args + result */}
          <Box flex={1} display="flex" flexDirection="column" minWidth={0}>
            <Box display="flex" flexDirection="column" p={1.5} gap={1}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.08 }}>
                    {t('tools.arguments')}
                  </Typography>
                  {selectedTool ? (
                    <Typography variant="caption" color="rgba(148,163,184,0.95)">
                      {selectedTool.description}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="rgba(148,163,184,0.8)">
                      {t('tools.selectTool')}
                    </Typography>
                  )}
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  {executeError && (
                    <Typography variant="caption" color="error">
                      {executeError}
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayArrowIcon fontSize="small" />}
                    onClick={handleRun}
                    disabled={!selectedTool || executing}
                    sx={{ borderRadius: 999, textTransform: 'none' }}
                  >
                    {executing ? t('tools.running') : t('tools.run')}
                  </Button>
                </Box>
              </Box>

              <TextField
                multiline
                minRows={5}
                maxRows={10}
                value={argsJson}
                onChange={(e) => setArgsJson(e.target.value)}
                sx={{
                  '& .MuiInputBase-root': {
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: 12,
                    backgroundColor: 'rgba(15,23,42,0.9)',
                  },
                }}
                placeholder="{ }"
              />
            </Box>

            <Divider sx={{ borderColor: 'rgba(51,65,85,0.9)' }} />

            <Box flex={1} p={1.5} overflow="auto">
              <Typography
                variant="caption"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.08, display: 'block', mb: 0.5 }}
              >
                {t('tools.lastRun')}
              </Typography>

              {!lastRun && (
                <Typography variant="body2" color="rgba(148,163,184,0.95)">
                  {t('tools.noRunsYet')}
                </Typography>
              )}

              {lastRun && (
                <>
                  <Typography variant="caption" color="rgba(148,163,184,0.9)" display="block" mb={0.5}>
                    {lastRun.tool} · {lastRun.createdAt.toLocaleTimeString()} · {lastRun.ok ? 'OK' : 'ERROR'}
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 1.5,
                      borderRadius: 1.5,
                      backgroundColor: 'rgba(15,23,42,0.95)',
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      fontSize: 12,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '100%',
                      overflowY: 'auto',
                    }}
                  >
                    {lastRun.resultJson}
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

