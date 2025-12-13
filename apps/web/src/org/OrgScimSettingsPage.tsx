// apps/web/src/org/OrgScimSettingsPage.tsx

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
  FormControlLabel,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  fetchScimConnection,
  createScimConnection,
  rotateScimToken,
  ScimConnectionDto
} from '../api/scim';

export const OrgScimSettingsPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();

  const [connection, setConnection] = useState<ScimConnectionDto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const gradientBg =
    'radial-gradient(circle at top left, rgba(139,92,246,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(59,130,246,0.18), transparent 55%)';

  const load = async () => {
    if (!token || !orgId) return;
    const res = await fetchScimConnection(token, orgId);
    setConnection(res.connection);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, token]);

  const handleCreate = async () => {
    if (!token || !orgId) return;
    const res = await createScimConnection(token, orgId, { name: newName });
    setConnection(res.connection);
    setDialogOpen(false);
    setNewName('');
  };

  const handleRotate = async () => {
    if (!token || !orgId) return;
    const res = await rotateScimToken(token, orgId);
    setConnection((prev) => (prev ? { ...prev, bearerToken: res.bearerToken } : prev));
  };

  const copyToken = () => {
    if (connection?.bearerToken) {
      navigator.clipboard.writeText(connection.bearerToken);
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
        backgroundColor: 'background.default'
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <AutoAwesomeIcon fontSize="small" />
          <Box>
            <Typography variant="h6">SCIM provisioning</Typography>
            <Typography variant="caption" color="text.secondary">
              Configure SCIM 2.0 user and group provisioning from your identity provider.
            </Typography>
          </Box>
        </Box>
        {!connection && (
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Create connection
          </Button>
        )}
      </Box>

      {connection ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Connection name
              </Typography>
              <Typography variant="body1">{connection.name}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                SCIM endpoint
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                {typeof window !== 'undefined'
                  ? `${window.location.origin}/scim/${orgId}/v2/Users`
                  : `/scim/${orgId}/v2/Users`}
              </Typography>
            </Box>

            {connection.bearerToken && (
              <Box>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="subtitle2">Bearer token</Typography>
                  <Box display="flex" gap={1}>
                    <Button size="small" startIcon={<ContentCopyIcon />} onClick={copyToken}>
                      Copy
                    </Button>
                    <Button size="small" startIcon={<RefreshIcon />} onClick={() => void handleRotate()}>
                      Rotate
                    </Button>
                  </Box>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    p: 1,
                    backgroundColor: 'action.hover',
                    borderRadius: 1,
                    wordBreak: 'break-all'
                  }}
                >
                  {connection.bearerToken}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Save this token securely. It will not be shown again.
                </Typography>
              </Box>
            )}

            <FormControlLabel
              control={<Switch checked={connection.isEnabled} disabled />}
              label="Enabled"
            />
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              No SCIM connection configured. Create one to enable user provisioning.
            </Typography>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create SCIM connection</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Name"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., Okta SCIM"
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
