// apps/web/src/org/OrgModelsSettingsPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchOrgModels, ModelRegistryEntryDto, upsertOrgModel } from '../api/modelRegistry';

export const OrgModelsSettingsPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();

  const [models, setModels] = useState<ModelRegistryEntryDto[]>([]);
  const [editing, setEditing] = useState<ModelRegistryEntryDto | null>(null);

  const gradientBg =
    'radial-gradient(circle at top left, rgba(52,211,153,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(59,130,246,0.18), transparent 55%)';

  const load = async () => {
    if (!token || !orgId) return;
    const res = await fetchOrgModels(token, orgId);
    setModels(res.models);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, token]);

  const startEdit = (entry: ModelRegistryEntryDto) => {
    setEditing(entry);
  };

  const handleSave = async () => {
    if (!token || !orgId || !editing) return;

    await upsertOrgModel(token, orgId, {
      provider: editing.provider,
      modelName: editing.modelName,
      displayName: editing.displayName,
      description: editing.description ?? undefined,
      isEnabled: editing.isEnabled,
      isDefault: editing.isDefault,
      capabilities: editing.capabilities,
      contextWindow: editing.contextWindow ?? undefined,
      maxOutputTokens: editing.maxOutputTokens ?? undefined,
      inputPriceMicros: editing.inputPriceMicros ?? undefined,
      outputPriceMicros: editing.outputPriceMicros ?? undefined,
      metadata: editing.metadata ?? undefined
    });

    setEditing(null);
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
            <Typography variant="h6">Models & providers</Typography>
            <Typography variant="caption" color="text.secondary">
              Control which models are available for chat profiles in this organization.
            </Typography>
          </Box>
        </Box>
        <Button size="small" startIcon={<RefreshIcon />} onClick={() => void load()}>
          Refresh
        </Button>
      </Box>

      <Card sx={{ borderRadius: 3, flex: 1, overflow: 'hidden' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
          <Typography variant="subtitle2">Usage by model</Typography>
          <Box
            sx={{
              mt: 1,
              flex: 1,
              overflow: 'auto',
              '& table': { width: '100%', borderCollapse: 'collapse' },
              '& th, & td': { padding: '6px 8px', fontSize: 13 },
              '& th': { textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' },
              '& tr:nth-of-type(even)': { backgroundColor: 'action.hover' }
            }}
          >
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Capabilities</th>
                  <th>Context</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {models.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <Typography variant="body2" color="text.secondary">
                        No models configured yet.
                      </Typography>
                    </td>
                  </tr>
                )}
                {models.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Typography variant="body2">{m.displayName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {m.provider}:{m.modelName} · {m.scope === 'org' ? 'Org override' : 'Global'}
                      </Typography>
                    </td>
                    <td>
                      {m.isEnabled ? (
                        <Chip size="small" label="Enabled" color="success" />
                      ) : (
                        <Chip size="small" label="Disabled" />
                      )}
                      {m.isDefault && <Chip size="small" label="Default" sx={{ ml: 0.5 }} />}
                    </td>
                    <td>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {m.capabilities.map((c) => (
                          <Chip key={c} size="small" label={c} />
                        ))}
                      </Box>
                    </td>
                    <td>
                      {m.contextWindow && (
                        <Typography variant="caption">{m.contextWindow.toLocaleString()}</Typography>
                      )}
                    </td>
                    <td>
                      <Button size="small" onClick={() => startEdit(m)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>

      {editing && (
        <Card
          sx={{
            borderRadius: 3,
            p: 2,
            position: 'fixed',
            bottom: 16,
            right: 16,
            width: 420,
            boxShadow: 8
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            Edit model – {editing.displayName}
          </Typography>
          <TextField
            label="Display name"
            fullWidth
            margin="dense"
            value={editing.displayName}
            onChange={(e) =>
              setEditing((prev) => (prev ? { ...prev, displayName: e.target.value } : prev))
            }
          />
          <TextField
            label="Description"
            fullWidth
            margin="dense"
            value={editing.description || ''}
            onChange={(e) =>
              setEditing((prev) => (prev ? { ...prev, description: e.target.value } : prev))
            }
          />
          <FormControlLabel
            control={
              <Switch
                checked={editing.isEnabled}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, isEnabled: e.target.checked } : prev
                  )
                }
              />
            }
            label="Enabled for this org"
          />
          <FormControlLabel
            control={
              <Switch
                checked={editing.isDefault}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, isDefault: e.target.checked } : prev
                  )
                }
              />
            }
            label="Use as default model for this provider"
          />

          <Box display="flex" justifyContent="flex-end" gap={1} mt={1.5}>
            <Button size="small" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="small" variant="contained" onClick={() => void handleSave()}>
              Save
            </Button>
          </Box>
        </Card>
      )}
    </Box>
  );
};
