import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  IconButton,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import { ConversationSettingsDrawer } from './ConversationSettingsDrawer';
import { ChatSettingsBar } from './ChatSettingsBar';
import { ToolsPanel } from './ToolsPanel';
import { PromptLibraryDrawer } from '../prompts/PromptLibraryDrawer';
import { PromptTemplateEditorDialog } from '../prompts/PromptTemplateEditorDialog';
import { useAuth } from '../auth/AuthContext';
import { usePromptTemplates } from '../prompts/usePromptTemplates';
import { CreatePromptTemplateInput } from '../api/prompts';
import {
  createConversation,
  updateConversation,
} from '../api/conversations';
import { ChatView } from './ChatView';
import { MessageInput } from './MessageInput';
import { ConversationExportDialog } from '../conversations/ConversationExportDialog';
import { ConversationShareDialog } from '../conversations/ConversationShareDialog';
import { useChat } from '../hooks/useChat';
import { VoiceModeOverlay } from './VoiceModeOverlay';
import { BentoGrid } from '../components/ui/kinetic/BentoGrid';
import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { SpecularButton } from '../components/ui/kinetic/SpecularButton';
import { useEcoMode } from '../hooks/useEcoMode';
import { useParams } from 'react-router-dom';

function clampTemperature(value: number): number {
  if (Number.isNaN(value)) return 0.7;
  if (value < 0) return 0;
  if (value > 2) return 2;
  return value;
}

function clampTopP(value: number): number {
  if (Number.isNaN(value)) return 1;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export const ChatPage: React.FC = () => {
  const { t } = useTranslation('chat');
  const { token } = useAuth();
  const { isEcoMode } = useEcoMode();
  const { conversationId: paramConversationId } = useParams();
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (paramConversationId) {
      setConversationId(paramConversationId);
    }
  }, [paramConversationId]);

  // Hook handles fetching, streaming, state
  const {
    conversation,
    usage,
    messages,
    streamingText,
    toolStatus,
    isStreaming,
    sendMessage,
    regenerate,
    stop,
    refetch: refetchConversation
  } = useChat({
    conversationId,
    onError: (err) => console.error("Chat Error:", err),
  });

  const [model, setModel] = useState<string>('llama3.1');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(1);
  const [dirty, setDirty] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [toolsOpen, setToolsOpen] = useState<boolean>(false);
  const [promptLibraryOpen, setPromptLibraryOpen] = useState<boolean>(false);
  const [templateEditorOpen, setTemplateEditorOpen] = useState<boolean>(false);
  const [messageInputValue, setMessageInputValue] = useState<string>('');
  const [exportDialogOpen, setExportDialogOpen] = useState<boolean>(false);
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);
  const [voiceModeOpen, setVoiceModeOpen] = useState<boolean>(false);
  
  const { user } = useAuth();
  const { createTemplate, updateTemplate } = usePromptTemplates(conversation?.orgId ?? null);

  // Listen for conversation selection/creation events from sidebar
  useEffect(() => {
    const handleSelect = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setConversationId(id);
    };

    const handleCreated = async (_e: Event) => {
      if (!token) return;
      try {
        const resp = await createConversation(token, { title: t('conversation.new') });
        const event = new CustomEvent('conversation-created', { detail: resp.id });
        window.dispatchEvent(event);
        setConversationId(resp.id);
      } catch {
        // ignore
      }
    };

    const handleExport = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setConversationId(id);
      setExportDialogOpen(true);
    };

    const handleShare = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setConversationId(id);
      setShareDialogOpen(true);
    };

    window.addEventListener('select-conversation', handleSelect);
    window.addEventListener('create-conversation', handleCreated);
    window.addEventListener('conversation-export', handleExport);
    window.addEventListener('conversation-share', handleShare);

    return () => {
      window.removeEventListener('select-conversation', handleSelect);
      window.removeEventListener('create-conversation', handleCreated);
      window.removeEventListener('conversation-export', handleExport);
      window.removeEventListener('conversation-share', handleShare);
    };
  }, [token, t]);

  // Sync settings with loaded conversation
  useEffect(() => {
    if (conversation) {
        // Only update if not dirty to avoid overwriting user edits while typing
        if (!dirty) {
            const nextModel = conversation.model || 'llama3.1';
            const nextTemp = clampTemperature(conversation.temperature ?? 0.7);
            const nextTopP = clampTopP(conversation.topP ?? 1);
            setModel(nextModel);
            setTemperature(nextTemp);
            setTopP(nextTopP);
        }
    }
  }, [conversation, dirty]);

  // Auto-clear the "Saved" chip after some time
  useEffect(() => {
    if (!savedAt) return;
    const timeout = window.setTimeout(() => {
      setSavedAt(null);
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [savedAt]);

  const handleSend = useCallback(async (content: string, images?: string[]) => {
    await sendMessage(content, images, {
        model,
        temperature,
        topP
    });
  }, [sendMessage, model, temperature, topP]);

  const handleSaveSettings = async () => {
    if (!token || !conversationId) return;

    setSaving(true);
    try {
      await updateConversation(token, conversationId, {
        model,
        temperature,
        topP,
      });
      // Refetch to ensure everything is in sync
      await refetchConversation();
      setDirty(false);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (!conversation) return;
    const baseModel = conversation.model || 'llama3.1';
    const baseTemp = clampTemperature(conversation.temperature ?? 0.7);
    const baseTopP = clampTopP(conversation.topP ?? 1);
    setModel(baseModel);
    setTemperature(baseTemp);
    setTopP(baseTopP);
    setDirty(false);
  };

  const handleChangeModel = useCallback((value: string) => {
    setModel(value);
    setDirty(true);
  }, []);

  const handleChangeTemperature = useCallback((_: Event, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setTemperature(v);
    setDirty(true);
  }, []);

  const handleChangeTopP = useCallback((_: Event, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setTopP(v);
    setDirty(true);
  }, []);

  const handleOpenTools = useCallback(() => setToolsOpen(true), []);
  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);

  const currentTitle = conversation?.title || t('conversation.new');

  return (
    <BentoGrid sx={{ height: '100%', gridTemplateColumns: '1fr', p: 2 }}>
      {/* Settings bar */}
      <ChatSettingsBar
        title={currentTitle}
        model={model}
        temperature={temperature}
        topP={topP}
        dirty={dirty}
        saving={saving}
        savedAt={savedAt}
        usage={usage}
        conversationId={conversationId}
        isEcoMode={isEcoMode}
        onChangeModel={handleChangeModel}
        onChangeTemperature={handleChangeTemperature}
        onChangeTopP={handleChangeTopP}
        onSaveSettings={handleSaveSettings}
        onResetSettings={handleResetSettings}
        onOpenTools={handleOpenTools}
        onOpenSettings={handleOpenSettings}
      />

      {/* Chat view */}
      <GlassPanel refractive={!isEcoMode} sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ChatView messages={messages ?? []} streamingAssistantText={streamingText} toolStatus={toolStatus} />

        {/* Regenerate Button */}
        {!isStreaming && messages && messages.length > 0 &&
        (messages[messages.length - 1].role === 'ASSISTANT' ||
          messages[messages.length - 1].role === 'assistant') && (
          <Box display="flex" justifyContent="center" pb={1}>
            <SpecularButton
              startIcon={<RestartAltIcon />}
              size="small"
              variant="outlined"
              onClick={regenerate}
              data-ai-action="regenerate"
              sx={{
                borderRadius: 4,
                borderColor: 'rgba(255,255,255,0.12)',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  bgcolor: 'rgba(124,77,255,0.04)'
                }
              }}
            >
              {t('chat.regenerate', 'Regenerate response')}
            </SpecularButton>
          </Box>
        )}
      </GlassPanel>

      {/* Input Area */}
      <GlassPanel refractive={!isEcoMode} sx={{ p: 1 }}>
        <Box display="flex" alignItems="center" gap={0.5} px={2} pb={0.5}>
          <IconButton
            size="small"
            onClick={() => setPromptLibraryOpen(true)}
            sx={{ opacity: 0.7 }}
            title={t('settings.promptLibrary')}
            aria-label={t('settings.promptLibrary')}
          >
            <AutoAwesomeIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setVoiceModeOpen(true)}
            sx={{ opacity: 0.7 }}
            title={t('chat.voiceMode', 'Voice Mode')}
            aria-label={t('chat.voiceMode', 'Voice Mode')}
          >
            <HeadphonesIcon fontSize="small" />
          </IconButton>
        </Box>
        <MessageInput
          disabled={!conversationId || isStreaming}
          isStreaming={isStreaming}
          onStop={stop}
          onSend={handleSend}
          value={messageInputValue}
          onChange={setMessageInputValue}
        />
      </GlassPanel>

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

      <VoiceModeOverlay
        open={voiceModeOpen}
        onClose={() => setVoiceModeOpen(false)}
        onSend={(content) => handleSend(content)}
        isStreaming={isStreaming}
        streamingText={streamingText}
        latestAssistantMessageContent={
          messages && messages.length > 0 && messages[messages.length - 1].role.toLowerCase() === 'assistant'
            ? messages[messages.length - 1].content
            : undefined
        }
      />
    </BentoGrid>
  );
};
