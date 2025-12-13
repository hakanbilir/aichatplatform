// apps/web/src/presets/PresetsGalleryPage.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  IconButton,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useParams, useNavigate } from 'react-router-dom';
import { useConversationPresets } from './useConversationPresets';
import { PresetEditorDialog } from './PresetEditorDialog';
import { ConversationPreset, CreateConversationPresetInput } from '../api/presets';

export const PresetsGalleryPage: React.FC = () => {
  const { t } = useTranslation(['presets', 'common']);
  const { orgId } = useParams<{ orgId: string }>();
  const { presets, loading, error, createPreset, updatePreset } = useConversationPresets(orgId || null);
  const navigate = useNavigate();

  // Dialog state / Dialog durumu
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ConversationPreset | null>(null);

  const gradientBg =
    'radial-gradient(circle at top left, rgba(52,211,153,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(96,165,250,0.2), transparent 55%)';

  const handleStartConversation = (presetId: string) => {
    if (!orgId) return;
    // Navigate to create conversation with preset / Preset ile konuşma oluşturmak için git
    navigate(`/app/orgs/${orgId}/chat/new?presetId=${presetId}`);
  };

  const handleOpenEditor = (preset?: ConversationPreset) => {
    setEditingPreset(preset || null);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setEditingPreset(null);
  };

  const handleSavePreset = async (input: CreateConversationPresetInput, existingId?: string) => {
    if (!orgId) return;
    if (existingId) {
      await updatePreset(existingId, input);
    } else {
      await createPreset(input);
    }
  };

  const handleEditClick = (e: React.MouseEvent, preset: ConversationPreset) => {
    e.stopPropagation(); // Prevent card click / Kart tıklamasını önle
    handleOpenEditor(preset);
  };

  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: '100%',
        backgroundImage: gradientBg,
        backgroundColor: 'background.default'
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <AutoAwesomeIcon fontSize="small" />
          <Box>
            <Typography variant="h6">{t('title')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('subtitle')}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => handleOpenEditor()}
        >
          {t('newPreset')}
        </Button>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={24} />
        </Box>
      )}
      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}

      {!loading && !error && presets.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {t('noPresets')}
        </Typography>
      )}

      {!loading && !error && presets.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))'
            },
            gap: 2,
            mt: 1
          }}
        >
          {presets.map((preset) => {
            const color = (preset.uiConfig as any)?.color || '#6366f1';
            const emoji = (preset.uiConfig as any)?.emoji || '✨';

            return (
              <Card key={preset.id} sx={{ borderRadius: 3, position: 'relative' }}>
                <CardActionArea
                  onClick={() => handleStartConversation(preset.id)}
                  sx={{
                    borderRadius: 3,
                    height: '100%'
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '999px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `radial-gradient(circle at 30% 30%, ${color}, transparent 60%)`
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{emoji}</span>
                      </Box>
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        {preset.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleEditClick(e, preset)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 1,
                          backgroundColor: 'background.paper',
                          '&:hover': {
                            backgroundColor: 'action.hover'
                          }
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ minHeight: 40 }}
                    >
                      {preset.description || t('noDescription')}
                    </Typography>
                    <Box mt={1.5}>
                      <Typography variant="caption" color="text.secondary">
                        {t('model')}
                      </Typography>
                      <Typography variant="body2">
                        {(preset.config as any)?.modelId || t('default')}
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Preset Editor Dialog / Preset Düzenleyici Dialog */}
      <PresetEditorDialog
        open={editorOpen}
        onClose={handleCloseEditor}
        orgId={orgId || null}
        initialPreset={editingPreset}
        onSave={handleSavePreset}
      />
    </Box>
  );
};

