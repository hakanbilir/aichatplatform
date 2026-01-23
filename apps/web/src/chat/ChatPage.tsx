import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import ExtensionIcon from '@mui/icons-material/Extension';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { ConversationSettingsDrawer } from './ConversationSettingsDrawer';
import { ToolsPanel } from './ToolsPanel';
import { PromptLibraryDrawer } from '../prompts/PromptLibraryDrawer';
import { PromptTemplateEditorDialog } from '../prompts/PromptTemplateEditorDialog';
import { useAuth } from '../auth/AuthContext';
import { usePromptTemplates } from '../prompts/usePromptTemplates';
import { CreatePromptTemplateInput } from '../api/prompts';
import { ChatView } from './ChatView';
import { MessageInput } from './MessageInput';
import { ConversationExportDialog } from '../conversations/ConversationExportDialog';
import { ConversationShareDialog } from '../conversations/ConversationShareDialog';
import { useChat } from '../hooks/useChat';

export const ChatPage: React.FC = () => {
  const { t } = useTranslation('chat');
  const { user } = useAuth();

  const {
    conversationId,
    conversation,
    streamingText,
    streaming,
    model,
    setModel,
    temperature,
    setTemperature,
    topP,
    setTopP,
    dirty,
    saving,
    savedAt,
    usage,
    sendMessage,
    saveSettings,
    resetSettings
  } = useChat();

  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [toolsOpen, setToolsOpen] = useState<boolean>(false);
  const [promptLibraryOpen, setPromptLibraryOpen] = useState<boolean>(false);
  const [templateEditorOpen, setTemplateEditorOpen] = useState<boolean>(false);
  const [messageInputValue, setMessageInputValue] = useState<string>('');
  const [exportDialogOpen, setExportDialogOpen] = useState<boolean>(false);
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);

  const { createTemplate, updateTemplate } = usePromptTemplates(conversation?.orgId ?? null);

  // Get model options with translations
  const MODEL_OPTIONS: { value: string; label: string }[] = [
    { value: 'llama3.1', label: t('models.llama3.1') },
    { value: 'llama3.1:8b', label: t('models.llama3.1:8b') },
    { value: 'qwen2.5-coder', label: t('models.qwen2.5-coder') },
    { value: 'deepseek-r1', label: 'DeepSeek R1' },
  ];

  React.useEffect(() => {
      const handleExport = () => setExportDialogOpen(true);
      const handleShare = () => setShareDialogOpen(true);

      window.addEventListener('conversation-export', handleExport);
      window.addEventListener('conversation-share', handleShare);
      return () => {
          window.removeEventListener('conversation-export', handleExport);
          window.removeEventListener('conversation-share', handleShare);
      };
  }, []);


  const handleChangeModel = (value: string) => {
    setModel(value);
  };

  const handleChangeTemperature = (_: Event, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setTemperature(v);
  };

  const handleChangeTopP = (_: Event, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setTopP(v);
  };

  const currentTitle = conversation?.title || t('conversation.new');

  const creativityLabel =
    temperature < 0.4
      ? t('settings.creativity.precise')
      : temperature < 1
        ? t('settings.creativity.balanced')
        : t('settings.creativity.creative');

  return (
    <Box display="flex" flexDirection="column" flex={1}>
      {/* Settings bar */}
      <Box
        px={2}
        py={1}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'radial-gradient(circle at top left, rgba(124,77,255,0.16), transparent 55%)',
        }}
      >
        <Box flex={1} minWidth={0}>
          <Typography variant="subtitle2" noWrap>
            {currentTitle}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('settings.modelPerConversation')}
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 210 }}>
          <InputLabel id="model-select-label">{t('settings.model')}</InputLabel>
          <Select
            labelId="model-select-label"
            label={t('settings.model')}
            value={model}
            onChange={(e) => handleChangeModel(e.target.value)}
          >
            {MODEL_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box width={160} px={1}>
          <Typography variant="caption" color="text.secondary">
            {t('settings.temperature')}
          </Typography>
          <Slider size="small" value={temperature} min={0} max={2} step={0.1} onChange={handleChangeTemperature} />
        </Box>

        <Box width={130} px={1}>
          <Typography variant="caption" color="text.secondary">
            {t('settings.topP')}
          </Typography>
          <Slider size="small" value={topP} min={0} max={1} step={0.05} onChange={handleChangeTopP} />
        </Box>

        <Chip size="small" label={creativityLabel} sx={{ fontSize: 11, height: 24 }} variant="outlined" />

        {usage && (
          <>
            <Chip
              size="small"
              label={`${t('conversation.tokens')}: ${usage.totals.totalTokens.toLocaleString()}`}
              sx={{ fontSize: 11, height: 24 }}
              variant="outlined"
            />
            <Chip
              size="small"
              label={`${t('conversation.completions')}: ${usage.completions}`}
              sx={{ fontSize: 11, height: 24 }}
              variant="outlined"
            />
          </>
        )}

        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title={t('settings.toolsPanel')}>
            <span>
              <IconButton size="small" onClick={() => setToolsOpen(true)} disabled={!conversationId}>
                <ExtensionIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('settings.advancedSettings')}>
            <span>
              <IconButton size="small" onClick={() => setSettingsOpen(true)} disabled={!conversationId}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('settings.resetSettings')}>
            <span>
              <IconButton size="small" onClick={resetSettings} disabled={!conversation}>
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={dirty ? t('settings.saveSettings') : t('settings.settingsUpToDate')}>
            <span>
              <IconButton
                size="small"
                color={dirty ? 'primary' : 'default'}
                onClick={saveSettings}
                disabled={!dirty || saving || !conversationId}
              >
                <SaveIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {savedAt && !dirty && (
            <Chip
              size="small"
              label={t('conversation.saved')}
              color="success"
              variant="outlined"
              sx={{ height: 22, fontSize: 11 }}
              className="micro-fade-in"
            />
          )}
        </Box>
      </Box>

      {/* Chat view + input */}
      <ChatView messages={conversation?.messages ?? []} streamingAssistantText={streamingText} />
      <Box display="flex" alignItems="center" gap={0.5} px={2} pb={0.5}>
        <IconButton
          size="small"
          onClick={() => setPromptLibraryOpen(true)}
          sx={{ opacity: 0.7 }}
          title={t('settings.promptLibrary')}
        >
          <AutoAwesomeIcon fontSize="small" />
        </IconButton>
      </Box>
      <MessageInput
        disabled={!conversationId || streaming}
        onSend={sendMessage}
        value={messageInputValue}
        onChange={setMessageInputValue}
      />

      {/* Settings drawer */}
      <ConversationSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        conversationId={conversationId}
      />

      {/* Tools panel */}
      <ToolsPanel
        open={toolsOpen}
        onClose={() => setToolsOpen(false)}
        conversationId={conversationId}
        orgId={conversation?.orgId ?? null}
      />

      {/* Prompt Library Drawer */}
      {conversation?.orgId && user && (
        <PromptLibraryDrawer
          orgId={conversation.orgId}
          open={promptLibraryOpen}
          onClose={() => setPromptLibraryOpen(false)}
          currentUserId={user.id}
          onApplyPrompt={(content) => {
            setMessageInputValue(content);
            setPromptLibraryOpen(false);
          }}
          onNewTemplate={() => {
            setTemplateEditorOpen(true);
            setPromptLibraryOpen(false);
          }}
        />
      )}

      {/* Prompt Template Editor */}
      {conversation?.orgId && (
        <PromptTemplateEditorDialog
          open={templateEditorOpen}
          onClose={() => setTemplateEditorOpen(false)}
          initialTemplate={null}
          onSave={async (input: CreatePromptTemplateInput, existingId?: string) => {
            if (existingId) {
              await updateTemplate(existingId, input);
            } else {
              await createTemplate(input);
            }
          }}
        />
      )}

      {/* Export Dialog */}
      {conversation && conversationId && conversation.orgId && (
        <ConversationExportDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          orgId={conversation.orgId}
          conversationId={conversationId}
        />
      )}

      {/* Share Dialog */}
      {conversation && conversationId && conversation.orgId && (
        <ConversationShareDialog
          open={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
          orgId={conversation.orgId}
          conversationId={conversationId}
          basePublicUrl={window.location.origin}
        />
      )}
    </Box>
  );
};
