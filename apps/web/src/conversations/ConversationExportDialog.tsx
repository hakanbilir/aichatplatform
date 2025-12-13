// apps/web/src/conversations/ConversationExportDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Select,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import DownloadIcon from '@mui/icons-material/Download';
import { ConversationExportFormat, createExportJob, fetchExportJob } from '../api/exports';
import { useAuth } from '../auth/AuthContext';

interface ConversationExportDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  conversationId: string;
}

export const ConversationExportDialog: React.FC<ConversationExportDialogProps> = ({
  open,
  onClose,
  orgId,
  conversationId
}) => {
  const { t } = useTranslation(['conversations', 'common']);
  const { token } = useAuth();
  const [format, setFormat] = useState<ConversationExportFormat>('markdown');
  const [exportId, setExportId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setExportId(null);
      setStatus(null);
      setFileUrl(null);
      setError(null);
    }
  }, [open]);

  // Poll for export status if job is pending/processing
  useEffect(() => {
    if (!exportId || !token || status === 'completed' || status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const job = await fetchExportJob(token, orgId, exportId);
        setStatus(job.status);
        if (job.fileUrl) {
          setFileUrl(job.fileUrl);
        }
        if (job.status === 'failed') {
          setError(t('export.failed'));
        }
      } catch (err) {
        setError((err as Error).message);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [exportId, token, orgId, status]);

  const handleStartExport = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createExportJob(token, orgId, conversationId, format);
      setExportId(res.exportId);
      setStatus(res.status);
    } catch (err) {
      setError((err as Error).message || t('export.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!fileUrl) return;
    // For local file paths, we'd need a download endpoint
    // For now, assume fileUrl is accessible
    window.open(fileUrl, '_blank');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('export.title')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('export.format')}
          </Typography>
          <Select
            size="small"
            fullWidth
            value={format}
            onChange={(e) => setFormat(e.target.value as ConversationExportFormat)}
            disabled={!!exportId}
          >
            <MenuItem value="markdown">Markdown (.md)</MenuItem>
            <MenuItem value="jsonl">JSON Lines (.jsonl)</MenuItem>
            <MenuItem value="html">HTML (.html)</MenuItem>
          </Select>
        </Box>

        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}

        {exportId && (
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              {t('common:status')}: {status && t(`export.status.${status}`)}
            </Typography>
            {(status === 'pending' || status === 'processing') && (
              <LinearProgress sx={{ mt: 1 }} />
            )}
            {fileUrl && status === 'completed' && (
              <Box mt={1}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  fullWidth
                >
                  {t('export.download')}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {!exportId && (
          <Button onClick={handleStartExport} disabled={loading} variant="contained">
            {loading ? t('export.exporting') : t('export.startExport')}
          </Button>
        )}
        <Button onClick={onClose}>{t('close', { ns: 'common' })}</Button>
      </DialogActions>
    </Dialog>
  );
};

