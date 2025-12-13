// apps/web/src/org/ExperimentsPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  fetchExperiments,
  createExperiment,
  runExperiment
} from '../api/experiments';

export const ExperimentsPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();

  const [experiments, setExperiments] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const gradientBg =
    'radial-gradient(circle at top left, rgba(236,72,153,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(59,130,246,0.18), transparent 55%)';

  const load = async () => {
    if (!token || !orgId) return;
    const res = await fetchExperiments(token, orgId);
    setExperiments(res.experiments);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, token]);

  const handleCreate = async () => {
    if (!token || !orgId) return;
    await createExperiment(token, orgId, { name: newName, description: newDesc });
    setDialogOpen(false);
    setNewName('');
    setNewDesc('');
    await load();
  };

  const handleRun = async (id: string) => {
    if (!token || !orgId) return;
    await runExperiment(token, orgId, id, {});
    await load();
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
            <Typography variant="h6">Experiments</Typography>
            <Typography variant="caption" color="text.secondary">
              Run A/B tests across prompt variants and inputs.
            </Typography>
          </Box>
        </Box>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          New experiment
        </Button>
      </Box>

      <Card sx={{ borderRadius: 3, flex: 1 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {experiments.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No experiments yet.
            </Typography>
          )}

          {experiments.map((exp) => (
            <Box
              key={exp.id}
              sx={{
                p: 1.25,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box>
                <Typography variant="body1">{exp.name}</Typography>
                {exp.description && (
                  <Typography variant="body2" color="text.secondary">
                    {exp.description}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {exp.variants?.length || 0} variants · {exp.inputs?.length || 0} inputs ·{' '}
                  {exp.runs?.length || 0} runs
                </Typography>
              </Box>
              <Button size="small" onClick={() => void handleRun(exp.id)}>
                Run
              </Button>
            </Box>
          ))}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New experiment</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Name"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={2}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!newName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
