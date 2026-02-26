import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import { useParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import {
  PromptTemplateDetailDto,
  PromptTemplateVersionDto,
  fetchPromptTemplateDetail,
  createPromptTemplateVersion,
  createPromptTemplateApi,
  fetchPromptTemplates,
  PromptTemplate,
} from '../api/prompts';
import { BentoGrid } from '../components/ui/kinetic/BentoGrid';
import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { KineticTypography } from '../components/ui/kinetic/KineticTypography';
import { SpecularButton } from '../components/ui/kinetic/SpecularButton';
import { useEcoMode } from '../hooks/useEcoMode';

export const PromptTemplatesPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();
  const { isEcoMode } = useEcoMode();

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selected, setSelected] = useState<PromptTemplateDetailDto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSystemPrompt, setNewSystemPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newVersionPrompt, setNewVersionPrompt] = useState('');

  const load = useCallback(async () => {
    if (!token || !orgId) return;
    try {
      const res = await fetchPromptTemplates(token, orgId);
      setTemplates(res);
    } catch (err) {
      console.error(err);
      setError('Failed to load prompt templates.');
    }
  }, [token, orgId]);

  const loadDetail = async (id: string) => {
    if (!token || !orgId) return;
    try {
      const res = await fetchPromptTemplateDetail(token, orgId, id);
      setSelected(res.template);
    } catch (err) {
      console.error(err);
      setError('Failed to load template details.');
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreateTemplate = async () => {
    if (!token || !orgId) return;

    setLoading(true);
    setError(null);
    try {
      await createPromptTemplateApi(token, orgId, {
        name: newName,
        description: newDesc,
        systemPrompt: newSystemPrompt,
      });

      setDialogOpen(false);
      setNewName('');
      setNewDesc('');
      setNewSystemPrompt('');
      await load();
    } catch (err) {
      console.error(err);
      setError('Failed to create prompt template.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVersion = async () => {
    if (!token || !orgId || !selected) return;

    setLoading(true);
    setError(null);
    try {
      await createPromptTemplateVersion(token, orgId, selected.id, {
        systemPrompt: newVersionPrompt,
      });
      setNewVersionPrompt('');
      await loadDetail(selected.id);
    } catch (err) {
      console.error(err);
      setError('Failed to add new version.');
    } finally {
      setLoading(false);
    }
  };

  const renderVersions = (versions: PromptTemplateVersionDto[] | undefined) => {
    if (!versions || versions.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No versions yet.
        </Typography>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
        {versions.map((v) => (
          <GlassPanel
            key={v.id}
            refractive={false}
            sx={{ p: 2, border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                v{v.version}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {v.createdByDisplayName || 'Unknown'} · {new Date(v.createdAt).toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'rgba(0,0,0,0.2)',
                fontFamily: 'monospace',
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                color: 'text.secondary',
              }}
            >
              {v.systemPrompt}
            </Box>
          </GlassPanel>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column' }}>
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={1}>
          <AutoAwesomeIcon fontSize="medium" />
          <KineticTypography variant="h4" component="h1">
            Prompt Templates
          </KineticTypography>
        </Box>
        <SpecularButton
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={loading}
        >
          New Template
        </SpecularButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <BentoGrid sx={{ flex: 1, minHeight: 0 }}>
        {/* Sidebar List */}
        <GlassPanel
          refractive={!isEcoMode}
          sx={{
            gridColumn: 'span 1',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <List dense sx={{ flex: 1, overflow: 'auto', p: 1 }}>
            {templates.map((t) => (
              <ListItemButton
                key={t.id}
                selected={selected?.id === t.id}
                onClick={() => void loadDetail(t.id)}
                disabled={loading}
                sx={{ borderRadius: 2, mb: 0.5 }}
              >
                <ListItemText
                  primary={
                    <Typography fontWeight={selected?.id === t.id ? 'bold' : 'normal'}>
                      {t.name}
                    </Typography>
                  }
                  secondary={
                    t.description ||
                    t.latestVersion?.systemPrompt.slice(0, 40) + '...' ||
                    'No content'
                  }
                  secondaryTypographyProps={{ noWrap: true }}
                />
              </ListItemButton>
            ))}
            {templates.length === 0 && (
              <Box p={2}>
                <Typography variant="body2" color="text.secondary">
                  No templates found. Create one to get started.
                </Typography>
              </Box>
            )}
          </List>
        </GlassPanel>

        {/* Main Content */}
        <GlassPanel
          refractive={!isEcoMode}
          sx={{
            gridColumn: 'span 2',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            p: 3,
          }}
        >
          {selected ? (
            <Box sx={{ height: '100%', overflow: 'auto', pr: 1 }}>
              <KineticTypography variant="h5" gutterBottom>
                {selected.name}
              </KineticTypography>
              {selected.description && (
                <Typography variant="body1" color="text.secondary" paragraph>
                  {selected.description}
                </Typography>
              )}

              <Box mt={4}>
                <KineticTypography variant="h6" gutterBottom>
                  Add New Version
                </KineticTypography>
                <TextField
                  multiline
                  minRows={4}
                  fullWidth
                  placeholder="Enter updated system prompt..."
                  value={newVersionPrompt}
                  onChange={(e) => setNewVersionPrompt(e.target.value)}
                  disabled={loading}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(0,0,0,0.2)',
                    },
                  }}
                />
                <Box mt={2} display="flex" justifyContent="flex-end">
                  <SpecularButton
                    variant="contained"
                    disabled={!newVersionPrompt.trim() || loading}
                    onClick={handleAddVersion}
                  >
                    Save Version
                  </SpecularButton>
                </Box>
              </Box>

              <Box mt={4}>
                <KineticTypography variant="h6">History</KineticTypography>
                {renderVersions(selected.versions)}
              </Box>
            </Box>
          ) : (
            <Box height="100%" display="flex" alignItems="center" justifyContent="center">
              <Typography variant="body1" color="text.secondary">
                Select a template from the list to view details.
              </Typography>
            </Box>
          )}
        </GlassPanel>
      </BentoGrid>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle>New Prompt Template</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Name"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={loading}
          />
          <TextField
            label="Description"
            fullWidth
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            disabled={loading}
          />
          <TextField
            label="System Prompt"
            multiline
            minRows={4}
            fullWidth
            value={newSystemPrompt}
            onChange={(e) => setNewSystemPrompt(e.target.value)}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <SpecularButton onClick={() => setDialogOpen(false)} disabled={loading} color="inherit">
            Cancel
          </SpecularButton>
          <SpecularButton
            variant="contained"
            onClick={handleCreateTemplate}
            disabled={!newName.trim() || !newSystemPrompt.trim() || loading}
          >
            Create
          </SpecularButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
