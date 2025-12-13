// apps/web/src/presets/PresetsQuickStrip.tsx

import React from 'react';
import { Box, Chip, Skeleton, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useConversationPresets } from './useConversationPresets';
import { useNavigate, useParams } from 'react-router-dom';

export const PresetsQuickStrip: React.FC = () => {
  const { t } = useTranslation('presets');
  const { orgId } = useParams<{ orgId: string }>();
  const { presets, loading } = useConversationPresets(orgId || null);
  const navigate = useNavigate();

  if (!orgId) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="caption" color="text.secondary">
          {t('quickStrip.startWithPreset')}
        </Typography>
        <Typography
          variant="caption"
          color="primary"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate(`/app/orgs/${orgId}/presets`)}
        >
          {t('quickStrip.managePresets')}
        </Typography>
      </Box>
      <Box display="flex" gap={1} overflow="auto" pb={0.5}>
        {loading && (
          <>
            <Skeleton variant="rounded" width={96} height={32} />
            <Skeleton variant="rounded" width={96} height={32} />
          </>
        )}
        {!loading && presets.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            {t('quickStrip.noPresetsYet')}
          </Typography>
        )}
        {!loading &&
          presets.length > 0 &&
          presets.map((preset) => (
            <Chip
              key={preset.id}
              label={preset.name}
              onClick={() => navigate(`/app/orgs/${orgId}/chat/new?presetId=${preset.id}`)}
              sx={{ borderRadius: 999 }}
            />
          ))}
      </Box>
    </Box>
  );
};

