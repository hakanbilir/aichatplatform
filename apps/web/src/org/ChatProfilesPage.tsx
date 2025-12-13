// apps/web/src/org/ChatProfilesPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  ChatProfileDto,
  fetchChatProfiles,
  createChatProfile,
  deleteChatProfile
} from '../api/chatProfiles';
import { fetchPromptTemplates, PromptTemplate } from '../api/prompts';

export const ChatProfilesPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();

  const [profiles, setProfiles] = useState<ChatProfileDto[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modelProvider, setModelProvider] = useState('ollama');
  const [modelName, setModelName] = useState('llama3');
  const [isShared, setIsShared] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [systemTemplateId, setSystemTemplateId] = useState<string | null>(null);

  const gradientBg =
    'radial-gradient(circle at top left, rgba(236,72,153,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(56,189,248,0.18), transparent 55%)';

  const load = async () => {
    if (!token || !orgId) return;
    const [p, t] = await Promise.all([
      fetchChatProfiles(token, orgId),
      fetchPromptTemplates(token, orgId)
    ]);
    setProfiles(p.profiles);
    setTemplates(t);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, token]);

  const handleCreate = async () => {
    if (!token || !orgId) return;
    await createChatProfile(token, orgId, {
      name,
      description,
      modelProvider,
      modelName,
      isShared,
      isDefault,
      systemTemplateId: systemTemplateId || null
    });

    setDialogOpen(false);
    setName('');
    setDescription('');
    setSystemTemplateId(null);
    setIsDefault(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!token || !orgId) return;
    await deleteChatProfile(token, orgId, id);
    await load();
  };

  const findTemplateName = (id: string | null) => {
    if (!id) return 'None';
    const t = templates.find((t) => t.id === id);
    return t?.title || 'Unknown';
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
            <Typography variant="h6">Chat profiles</Typography>
            <Typography variant="caption" color="text.secondary">
              Create personas that define model, prompts and tools for new conversations.
            </Typography>
          </Box>
        </Box>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          New profile
        </Button>
      </Box>

      <Card sx={{ borderRadius: 3, flex: 1 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {profiles.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No profiles yet.
            </Typography>
          )}

          {profiles.map((p) => (
            <Box
              key={p.id}
              sx={{
                p: 1.25,
                borderRadius: 2,
                border: '1px solid',
                borderColor: p.isDefault ? 'primary.main' : 'divider',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body1">{p.name}</Typography>
                  {p.isDefault && <Chip size="small" label="Default" />}
                  {!p.isShared && <Chip size="small" label="Private" />}
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption" color="text.secondary">
                    {p.modelProvider} · {p.modelName}
                  </Typography>
                  <Button size="small" onClick={() => void handleDelete(p.id)}>
                    Delete
                  </Button>
                </Box>
              </Box>
              {p.description && (
                <Typography variant="body2" color="text.secondary">
                  {p.description}
                </Typography>
              )}

              <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                <Chip
                  size="small"
                  label={`System template: ${findTemplateName(p.systemTemplateId)}`}
                />
                <Chip size="small" label={`Tools: ${p.enableTools ? 'On' : 'Off'}`} />
                <Chip size="small" label={`RAG: ${p.enableRag ? 'On' : 'Off'}`} />
                <Chip size="small" label={`Safety: ${p.safetyLevel}`} />
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New chat profile</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Description"
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            label="Model provider"
            fullWidth
            value={modelProvider}
            onChange={(e) => setModelProvider(e.target.value)}
            helperText="Example: ollama, openai, anthropic"
          />
          <TextField
            label="Model name"
            fullWidth
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            helperText="Example: llama3, gpt-4.1, claude-3.5"
          />

          <TextField
            label="System template (ID)"
            fullWidth
            value={systemTemplateId || ''}
            onChange={(e) => setSystemTemplateId(e.target.value || null)}
            helperText="Paste template ID from Prompt Templates or leave blank"
          />

          <FormControlLabel
            control={
              <Switch checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
            }
            label="Shared with org"
          />
          <FormControlLabel
            control={
              <Switch checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            }
            label="Use as default profile for new conversations"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || !modelProvider || !modelName}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
