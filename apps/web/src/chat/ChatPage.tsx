import React, { useEffect, useState, useRef } from 'react';
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
import {
  ConversationDetails,
  getConversation,
  createConversation,
  updateConversation,
  getConversationUsage,
  ConversationUsageSummary,
} from '../api/conversations';
import { streamMessage, StreamEvent } from '../api/chat';
import { ChatView } from './ChatView';
import { MessageInput } from './MessageInput';
import { ConversationExportDialog } from '../conversations/ConversationExportDialog';
import { ConversationShareDialog } from '../conversations/ConversationShareDialog';

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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [streaming, setStreaming] = useState(false);

  const [model, setModel] = useState<string>('llama3.1');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(1);
  const [dirty, setDirty] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [usage, setUsage] = useState<ConversationUsageSummary | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [toolsOpen, setToolsOpen] = useState<boolean>(false);
  const [promptLibraryOpen, setPromptLibraryOpen] = useState<boolean>(false);
  const [templateEditorOpen, setTemplateEditorOpen] = useState<boolean>(false);
  const [messageInputValue, setMessageInputValue] = useState<string>('');
  const [exportDialogOpen, setExportDialogOpen] = useState<boolean>(false);
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);
  
  const { user } = useAuth();
  const { createTemplate, updateTemplate } = usePromptTemplates(conversation?.orgId ?? null);

  // Get model options with translations
  // Çevirilerle model seçeneklerini al
  const MODEL_OPTIONS: { value: string; label: string }[] = [
    { value: 'llama3.1', label: t('models.llama3.1') },
    { value: 'llama3.1:8b', label: t('models.llama3.1:8b') },
    { value: 'qwen2.5-coder', label: t('models.qwen2.5-coder') },
  ];

  // Listen for conversation selection/creation events from sidebar
  // Sidebar'dan konuşma seçimi/oluşturma event'lerini dinle
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
  }, [token]);

  // Load conversation details when id or auth changes
  // ID veya auth değiştiğinde konuşma detaylarını yükle
  useEffect(() => {
    if (!token || !conversationId) {
      setConversation(null);
      return;
    }

    let cancelled = false;

    async function load() {
      if (!token || !conversationId) return; // Type guard / Tip koruması
      const currentToken = token; // Capture for closure / Kapanış için yakala
      const currentConversationId = conversationId; // Capture for closure / Kapanış için yakala
      try {
        const [convResp, usageResp] = await Promise.all([
          getConversation(currentToken, currentConversationId),
          getConversationUsage(currentToken, currentConversationId).catch(() => null),
        ]);
        if (!cancelled) {
          const conv = convResp.conversation;
          setConversation(conv);
          const nextModel = conv.model || 'llama3.1';
          const nextTemp = clampTemperature(conv.temperature ?? 0.7);
          const nextTopP = clampTopP(conv.topP ?? 1);
          setModel(nextModel);
          setTemperature(nextTemp);
          setTopP(nextTopP);
          setStreamingText('');
          setDirty(false);
          if (usageResp) {
            setUsage(usageResp);
          }
        }
      } catch {
        if (!cancelled) setConversation(null);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token, conversationId]);

  // Auto-clear the "Saved" chip after some time
  // Bir süre sonra "Kaydedildi" chip'ini otomatik temizle
  useEffect(() => {
    if (!savedAt) return;
    const timeout = window.setTimeout(() => {
      setSavedAt(null);
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [savedAt]);

  const handleSend = async (content: string) => {
    if (!token || !conversationId) return;

    if (!conversation) {
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const localConversationId = conversationId;

    // Optimistically append user message locally
    // Kullanıcı mesajını yerel olarak iyimser bir şekilde ekle
    const userMessage = {
      id: `local-${Date.now()}`,
      role: 'USER',
      content,
    };

    setConversation((prev) =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, { ...userMessage, createdAt: new Date().toISOString() }],
          }
        : prev,
    );

    setStreamingText('');
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamMessage(
        token,
        localConversationId,
        {
          content,
          model,
          temperature,
          topP,
        },
        (event: StreamEvent) => {
          if (event.type === 'token') {
            setStreamingText((prev) => prev + event.token);
          }

          if (event.type === 'end' && event.message) {
            setStreamingText('');
            setConversation((prev) =>
              prev
                ? {
                    ...prev,
                    messages: [
                      ...prev.messages,
                      {
                        id: `assistant-${Date.now()}`,
                        role: 'ASSISTANT',
                        content: event.message.content,
                        createdAt: new Date().toISOString(),
                      },
                    ],
                  }
                : prev,
            );
          }
        },
        controller.signal,
      );
    } finally {
      setStreaming(false);
    }

    // Refresh from backend to align IDs and usage
    // ID'leri ve kullanımı hizalamak için backend'den yenile
    if (token && localConversationId) {
      try {
        const [convResp, usageResp] = await Promise.all([
          getConversation(token, localConversationId),
          getConversationUsage(token, localConversationId).catch(() => null),
        ]);
        setConversation(convResp.conversation);
        if (usageResp) {
          setUsage(usageResp);
        }
      } catch {
        // ignore
      }
    }
  };

  const handleSaveSettings = async () => {
    if (!token || !conversationId) return;

    setSaving(true);
    try {
      const resp = await updateConversation(token, conversationId, {
        model,
        temperature,
        topP,
      });
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              model: resp.conversation.model,
              temperature: resp.conversation.temperature,
              topP: resp.conversation.topP,
            }
          : prev,
      );
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

  const handleChangeModel = (value: string) => {
    setModel(value);
    setDirty(true);
  };

  const handleChangeTemperature = (_: Event, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setTemperature(v);
    setDirty(true);
  };

  const handleChangeTopP = (_: Event, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setTopP(v);
    setDirty(true);
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
      {/* Ayarlar çubuğu */}
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
              <IconButton size="small" onClick={handleResetSettings} disabled={!conversation}>
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={dirty ? t('settings.saveSettings') : t('settings.settingsUpToDate')}>
            <span>
              <IconButton
                size="small"
                color={dirty ? 'primary' : 'default'}
                onClick={handleSaveSettings}
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
      {/* Chat görünümü + input */}
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
        onSend={handleSend}
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
