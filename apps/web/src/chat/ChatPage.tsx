import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Box, IconButton } from '@mui/material';
import { useTranslation } from 'react-i18next';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { useOrgModels } from '../hooks/useOrgModels';
import { usePromptTemplates } from '../prompts/usePromptTemplates';
import { CreatePromptTemplateInput, PromptTemplate } from '../api/prompts';
import { createConversation, updateConversation } from '../api/conversations';
import { ConversationExportDialog } from '../conversations/ConversationExportDialog';
import { ConversationShareDialog } from '../conversations/ConversationShareDialog';
import { useChat } from '../hooks/useChat';
import { BentoGrid } from '../components/ui/kinetic/BentoGrid';
import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { SpecularButton } from '../components/ui/kinetic/SpecularButton';
import { useEcoMode } from '../hooks/useEcoMode';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { PromptLibraryDrawer } from '../prompts/PromptLibraryDrawer';
import { PromptTemplateEditorDialog } from '../prompts/PromptTemplateEditorDialog';

import { ConversationSettingsDrawer } from './ConversationSettingsDrawer';
import { ChatSettingsBar } from './ChatSettingsBar';
import { ToolsPanel } from './ToolsPanel';
import { ChatView } from './ChatView';
import { MessageInput, MessageInputHandle } from './MessageInput';
import { VoiceModeOverlay } from './VoiceModeOverlay';

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
  const { isEcoMode, toggleEcoMode } = useEcoMode();
  const { conversationId: paramConversationId, orgId: paramOrgId } = useParams();
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
    streamStore,
    sendMessage,
    regenerate,
    stop,
    refetch: refetchConversation,
  } = useChat({
    conversationId,
    onError: (err) => console.error('Chat Error:', err),
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
  // Optimization: use ref instead of state to prevent re-renders on every keystroke
  const inputRef = useRef<MessageInputHandle>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState<boolean>(false);
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);

  const { user, activeOrg } = useAuth();

  const effectiveOrgId = conversation?.orgId ?? paramOrgId ?? activeOrg?.id ?? null;
  const { data: orgModelsData } = useOrgModels(effectiveOrgId || '');
  const orgModels = orgModelsData?.models;

  const modelOptions = React.useMemo(() => {
    if (!orgModels) return [];
    return orgModels.map((m) => ({
      value: m.modelName,
      label: m.displayName,
    }));
  }, [orgModels]);

  const { createTemplate, updateTemplate } = usePromptTemplates(conversation?.orgId ?? null);

  // Performance optimization: Disable interim results to prevent excessive re-renders of ChatPage
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    supported: speechSupported,
  } = useSpeechToText({
    interimResults: false,
  });

  useEffect(() => {
    if (!isListening && transcript) {
      // Performance optimization: Use uncontrolled input to avoid re-renders
      inputRef.current?.appendValue(transcript);
      resetTranscript();
    }
  }, [isListening, transcript, resetTranscript]);

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
    } else if (orgModels && orgModels.length > 0 && !dirty) {
      // If new conversation and current default model is invalid, pick first available
      const isCurrentValid = orgModels.some((m) => m.modelName === model);
      if (!isCurrentValid) {
        setModel(orgModels[0].modelName);
      }
    }
  }, [conversation, dirty, orgModels, model]);

  // Auto-clear the "Saved" chip after some time
  useEffect(() => {
    if (!savedAt) return;
    const timeout = window.setTimeout(() => {
      setSavedAt(null);
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [savedAt]);

  const handleSend = useCallback(
    async (content: string, images?: string[]) => {
      await sendMessage(content, images, {
        model,
        temperature,
        topP,
      });
    },
    [sendMessage, model, temperature, topP],
  );

  const handleSaveSettings = useCallback(async () => {
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
  }, [token, conversationId, model, temperature, topP, refetchConversation]);

  const handleResetSettings = useCallback(() => {
    if (!conversation) return;
    const baseModel = conversation.model || 'llama3.1';
    const baseTemp = clampTemperature(conversation.temperature ?? 0.7);
    const baseTopP = clampTopP(conversation.topP ?? 1);
    setModel(baseModel);
    setTemperature(baseTemp);
    setTopP(baseTopP);
    setDirty(false);
  }, [conversation]);

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

  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);
  const handleCloseTools = useCallback(() => setToolsOpen(false), []);
  const handleClosePromptLibrary = useCallback(() => setPromptLibraryOpen(false), []);
  const handleCloseTemplateEditor = useCallback(() => {
    setTemplateEditorOpen(false);
    setEditingTemplate(null);
  }, []);
  const handleCloseExport = useCallback(() => setExportDialogOpen(false), []);
  const handleCloseShare = useCallback(() => setShareDialogOpen(false), []);

  const handleApplyPrompt = useCallback((content: string) => {
    inputRef.current?.setValue(content);
    setPromptLibraryOpen(false);
  }, []);

  const handleNewTemplate = useCallback(() => {
    setEditingTemplate(null);
    setTemplateEditorOpen(true);
    setPromptLibraryOpen(false);
  }, []);

  const handleEditTemplate = useCallback((template: PromptTemplate) => {
    setEditingTemplate(template);
    setTemplateEditorOpen(true);
    setPromptLibraryOpen(false);
  }, []);

  const handleSaveTemplate = useCallback(
    async (input: CreatePromptTemplateInput, existingId?: string) => {
      if (existingId) {
        await updateTemplate(existingId, input);
      } else {
        await createTemplate(input);
      }
    },
    [updateTemplate, createTemplate],
  );

  const currentTitle = conversation?.title || t('conversation.new');

  return (
    <BentoGrid sx={{ height: '100%', gridTemplateColumns: '1fr', p: 2 }}>
      {/* Settings bar */}
      <ChatSettingsBar
        title={currentTitle}
        model={model}
        models={modelOptions}
        temperature={temperature}
        topP={topP}
        dirty={dirty}
        saving={saving}
        savedAt={savedAt}
        usage={usage}
        conversationId={conversationId}
        isEcoMode={isEcoMode}
        onToggleEcoMode={toggleEcoMode}
        onChangeModel={handleChangeModel}
        onChangeTemperature={handleChangeTemperature}
        onChangeTopP={handleChangeTopP}
        onSaveSettings={handleSaveSettings}
        onResetSettings={handleResetSettings}
        onOpenTools={handleOpenTools}
        onOpenSettings={handleOpenSettings}
      />

      {/* Chat view */}
      <GlassPanel
        refractive={!isEcoMode}
        sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <ChatView
          messages={messages ?? []}
          streamingAssistantText={streamingText}
          toolStatus={toolStatus}
          streamStore={streamStore}
          isStreaming={isStreaming}
        />

        {/* Regenerate Button */}
        {!isStreaming &&
          messages &&
          messages.length > 0 &&
          (messages[messages.length - 1].role === 'ASSISTANT' ||
            messages[messages.length - 1].role === 'assistant') && (
            <Box display="flex" justifyContent="center" pb={1}>
              <SpecularButton
                startIcon={<RestartAltIcon />}
                size="small"
                variant="outlined"
                onClick={regenerate}
                aiAction="regenerate"
                sx={{
                  borderRadius: 4,
                  borderColor: 'rgba(255,255,255,0.12)',
                  color: 'text.secondary',
                  '&:hover': {
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    bgcolor: 'rgba(124,77,255,0.04)',
                  },
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
        </Box>
        <MessageInput
          ref={inputRef}
          disabled={!conversationId || isStreaming}
          isStreaming={isStreaming}
          onStop={stop}
          onSend={handleSend}
          isListening={isListening}
          transcript={transcript}
          onStartListening={speechSupported ? startListening : undefined}
          onStopListening={stopListening}
        />
      </GlassPanel>

      <VoiceModeOverlay isListening={isListening} transcript={transcript} onStop={stopListening} />

      {/* Settings drawer */}
      <ConversationSettingsDrawer
        open={settingsOpen}
        onClose={handleCloseSettings}
        conversationId={conversationId}
        orgId={effectiveOrgId}
        models={modelOptions}
        onSettingsSaved={refetchConversation}
      />

      {/* Tools panel */}
      <ToolsPanel
        open={toolsOpen}
        onClose={handleCloseTools}
        conversationId={conversationId}
        orgId={conversation?.orgId ?? null}
      />

      {/* Prompt Library Drawer */}
      {conversation?.orgId && user && (
        <PromptLibraryDrawer
          orgId={conversation.orgId}
          open={promptLibraryOpen}
          onClose={handleClosePromptLibrary}
          currentUserId={user.id}
          onApplyPrompt={handleApplyPrompt}
          onNewTemplate={handleNewTemplate}
          onEditTemplate={handleEditTemplate}
        />
      )}

      {/* Prompt Template Editor */}
      {conversation?.orgId && (
        <PromptTemplateEditorDialog
          open={templateEditorOpen}
          onClose={handleCloseTemplateEditor}
          initialTemplate={editingTemplate}
          onSave={handleSaveTemplate}
        />
      )}

      {/* Export Dialog */}
      {conversation && conversationId && conversation.orgId && (
        <ConversationExportDialog
          open={exportDialogOpen}
          onClose={handleCloseExport}
          orgId={conversation.orgId}
          conversationId={conversationId}
        />
      )}

      {/* Share Dialog */}
      {conversation && conversationId && conversation.orgId && (
        <ConversationShareDialog
          open={shareDialogOpen}
          onClose={handleCloseShare}
          orgId={conversation.orgId}
          conversationId={conversationId}
          basePublicUrl={window.location.origin}
        />
      )}
    </BentoGrid>
  );
};
