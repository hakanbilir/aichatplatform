// apps/web/src/org/OrgSsoSettingsPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import { useParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { fetchSsoConnections, createSsoConnection, SsoConnectionDto } from '../api/sso';

export const OrgSsoSettingsPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();

  const [connections, setConnections] = useState<SsoConnectionDto[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'saml' | 'oidc'>('saml');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gradientBg =
    'radial-gradient(circle at top left, rgba(139,92,246,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(59,130,246,0.18), transparent 55%)';

  const load = async () => {
    if (!token || !orgId) return;
    try {
      const res = await fetchSsoConnections(token, orgId);
      setConnections(res.connections);
    } catch (err) {
      console.error(err);
      setError('Failed to load SSO connections.');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, token]);

  const handleCreate = async () => {
    if (!token || !orgId) return;

    setLoading(true);
    setError(null);
    try {
      await createSsoConnection(token, orgId, {
        type: newType,
        name: newName,
        config: {},
      });
      setDialogOpen(false);
      setNewName('');
      await load();
    } catch (err) {
      console.error(err);
      setError('Failed to create SSO connection.');
    } finally {
      setLoading(false);
    }
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
        backgroundColor: 'background.default',
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <AutoAwesomeIcon fontSize="small" />
          <Box>
            <Typography variant="h6">SSO connections</Typography>
            <Typography variant="caption" color="text.secondary">
              Configure SAML or OIDC single sign-on for your organization.
            </Typography>
          </Box>
        </Box>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={loading}
        >
          New connection
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Card sx={{ borderRadius: 3, flex: 1 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {connections.length === 0 && !error && (
            <Typography variant="body2" color="text.secondary">
              No SSO connections configured yet.
            </Typography>
          )}

          {connections.map((c) => (
            <Box
              key={c.id}
              sx={{
                p: 1.25,
                borderRadius: 2,
                border: '1px solid',
                borderColor: c.isEnabled ? 'success.main' : 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography variant="body1">{c.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {c.type.toUpperCase()} · {c.isEnabled ? 'Enabled' : 'Disabled'}
                </Typography>
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New SSO connection</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Name"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={loading}
          />
          <TextField
            select
            label="Type"
            fullWidth
            value={newType}
            onChange={(e) => setNewType(e.target.value as 'saml' | 'oidc')}
            SelectProps={{ native: true }}
            disabled={loading}
          >
            <option value="saml">SAML 2.0</option>
            <option value="oidc">OIDC</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!newName.trim() || loading}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
