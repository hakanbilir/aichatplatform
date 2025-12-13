// apps/web/src/chat/ConversationRagSettings.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  FormControlLabel,
  MenuItem,
  Select,
  Slider,
  Switch,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../auth/AuthContext';
import { useKnowledgeSpaces } from '../knowledge/useKnowledgeSpaces';
import { useParams } from 'react-router-dom';
import { updateConversationSettings } from '../api/conversationSettings';

interface ConversationRagSettings {
  enabled: boolean;
  spaceId: string | null;
  maxChunks: number;
}

interface ConversationRagSettingsProps {
  conversationId: string;
  value: ConversationRagSettings | undefined;
  onChange: (value: ConversationRagSettings) => void;
}

export const ConversationRagSettingsPanel: React.FC<ConversationRagSettingsProps> = ({
  conversationId,
  value,
  onChange
}) => {
  const { t } = useTranslation('rag');
  const { token } = useAuth();
  const { orgId } = useParams<{ orgId: string }>();
  const { spaces } = useKnowledgeSpaces(orgId || null);

  const [local, setLocal] = useState<ConversationRagSettings>(() =>
    value ?? { enabled: false, spaceId: null, maxChunks: 4 }
  );

  useEffect(() => {
    if (value) {
      setLocal(value);
    }
  }, [value]);

  const handleSave = async (next: ConversationRagSettings) => {
    if (!token) return;
    setLocal(next);
    onChange(next);
    
    // Update conversation's kbConfig via settings endpoint
    const kbConfig = {
      rag: next
    };
    
    await updateConversationSettings(token, conversationId, {
      kbConfig: kbConfig as any
    });
  };

  const handleToggle = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    const next = { ...local, enabled: checked };
    void handleSave(next);
  };

  const handleSpaceChange = (spaceId: string | '') => {
    const next = { ...local, spaceId: spaceId || null };
    void handleSave(next);
  };

  const handleChunksChange = (_: React.SyntheticEvent | Event, value: number | number[]) => {
    const maxChunks = Array.isArray(value) ? value[0] : value;
    const next = { ...local, maxChunks };
    void handleSave(next);
  };

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      <Box display="flex" alignItems="center" gap={1}>
        <AutoAwesomeIcon fontSize="small" />
        <Typography variant="subtitle2">{t('title')}</Typography>
      </Box>

      <FormControlLabel
        control={<Switch checked={local.enabled} onChange={handleToggle} />}
        label={t('useOrgKnowledge')}
      />

      {local.enabled && (
        <>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('knowledgeSpace')}
            </Typography>
            <Select
              size="small"
              fullWidth
              value={local.spaceId || ''}
              onChange={(e) => handleSpaceChange(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">
                <em>{t('allSpaces')}</em>
              </MenuItem>
              {spaces.map((space) => (
                <MenuItem key={space.id} value={space.id}>
                  {space.name}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box mt={1}>
            <Typography variant="caption" color="text.secondary">
              {t('maxChunks')}: {local.maxChunks}
            </Typography>
            <Slider
              size="small"
              value={local.maxChunks}
              min={1}
              max={12}
              step={1}
              valueLabelDisplay="auto"
              onChangeCommitted={handleChunksChange}
            />
          </Box>

          <Typography variant="caption" color="text.secondary">
            {t('maxChunksHelper')}
          </Typography>
        </>
      )}
    </Box>
  );
};

