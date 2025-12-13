// apps/web/src/org/OrgMembersPage.tsx

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
  IconButton,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import {
  OrgMemberDto,
  OrgInvitationDto,
  fetchOrgMembers,
  inviteOrgMember,
  updateMemberRole,
  updateMemberStatus
} from '../api/orgAdminMembers';

export const OrgMembersPage: React.FC = () => {
  const { t } = useTranslation('org');
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();

  const [members, setMembers] = useState<OrgMemberDto[]>([]);
  const [invitations, setInvitations] = useState<OrgInvitationDto[]>([]);
  const [_loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');

  const gradientBg =
    'radial-gradient(circle at top left, rgba(129,140,248,0.16), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(56,189,248,0.18), transparent 55%)';

  const load = async () => {
    if (!token || !orgId) return;
    setLoading(true);
    try {
      const res = await fetchOrgMembers(token, orgId);
      setMembers(res.members);
      setInvitations(res.invitations);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, token]);

  const handleInvite = async () => {
    if (!token || !orgId) return;
    await inviteOrgMember(token, orgId, inviteEmail, inviteRole, 7);
    setInviteEmail('');
    setInviteRole('MEMBER');
    setDialogOpen(false);
    void load();
  };

  const handleRoleChange = async (userId: string, role: string) => {
    if (!token || !orgId) return;
    await updateMemberRole(token, orgId, userId, role);
    void load();
  };

  const handleToggleStatus = async (member: OrgMemberDto) => {
    if (!token || !orgId) return;
    await updateMemberStatus(token, orgId, member.id, member.status === 'active');
    void load();
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
            <Typography variant="h6">{t('members.title')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('members.description')}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<PersonAddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          {t('members.inviteMember')}
        </Button>
      </Box>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            {t('members.title')}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('members.email')}</TableCell>
                <TableCell>{t('members.name')}</TableCell>
                <TableCell>{t('members.role')}</TableCell>
                <TableCell>{t('members.status')}</TableCell>
                <TableCell align="right">{t('members.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{m.displayName || '—'}</TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as string)}
                    >
                      <MenuItem value="VIEWER">{t('members.viewer')}</MenuItem>
                      <MenuItem value="MEMBER">{t('members.member')}</MenuItem>
                      <MenuItem value="ADMIN">{t('members.admin')}</MenuItem>
                      <MenuItem value="OWNER">{t('members.owner')}</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {m.status === 'active' ? (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <CheckCircleIcon fontSize="small" color="success" />
                        <Typography variant="caption">{t('members.active')}</Typography>
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <BlockIcon fontSize="small" color="disabled" />
                        <Typography variant="caption">{t('members.disabled')}</Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleToggleStatus(m)}
                    >
                      {m.status === 'active' ? (
                        <BlockIcon fontSize="small" />
                      ) : (
                        <CheckCircleIcon fontSize="small" />
                      )}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            {t('members.pendingInvitations')}
          </Typography>
          {invitations.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t('members.noPendingInvitations')}
            </Typography>
          )}
          {invitations.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('members.email')}</TableCell>
                  <TableCell>{t('members.role')}</TableCell>
                  <TableCell>{t('members.status')}</TableCell>
                  <TableCell>{t('members.expires')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell>{inv.role}</TableCell>
                    <TableCell>{inv.status}</TableCell>
                    <TableCell>
                      {inv.expiresAt
                        ? new Date(inv.expiresAt).toLocaleDateString()
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('members.inviteDialogTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label={t('members.email')}
            type="email"
            fullWidth
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Select
            size="small"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as string)}
          >
            <MenuItem value="VIEWER">{t('members.viewer')}</MenuItem>
            <MenuItem value="MEMBER">{t('members.member')}</MenuItem>
            <MenuItem value="ADMIN">{t('members.admin')}</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('cancel', { ns: 'common' })}</Button>
          <Button
            onClick={handleInvite}
            disabled={!inviteEmail}
            variant="contained"
          >
            {t('members.sendInvite')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

