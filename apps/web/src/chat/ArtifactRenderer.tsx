import { useState, memo, useMemo, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Tabs, Tab, IconButton, Tooltip } from '@mui/material';
import { Code, Visibility, ContentCopy, Check } from '@mui/icons-material';

import { GlassPanel } from '../components/ui/kinetic/GlassPanel';

interface ArtifactRendererProps {
  title: string;
  type: 'html' | 'svg';
  code: string;
}

// Optimized with React.memo to prevent unnecessary re-renders when parent updates.
// Also uses useMemo for sanitization to avoid expensive DOMPurify calls on tab switches.
function ArtifactRendererComponent({ title, type, code }: ArtifactRendererProps) {
  const { t } = useTranslation('chat');
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [debouncedCode, setDebouncedCode] = useState(code);

  // Debounce code updates for preview to prevent frequent re-renders and expensive operations
  // during streaming. We keep the raw 'code' for the Code tab for real-time updates.
  useEffect(() => {
    // Optimization: conditionally skip the debounced code preview update when the preview tab
    // (activeTab === 0) is not active, preventing unnecessary state updates and re-renders during streaming.
    if (activeTab !== 0) {
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedCode(code);
    }, 200);
    return () => clearTimeout(timer);
  }, [code, activeTab]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const sanitizedCode = useMemo(() => {
    // Only sanitize if looking at preview and not HTML (HTML uses iframe srcDoc)
    if (activeTab !== 0 || type === 'html') return '';
    return DOMPurify.sanitize(debouncedCode);
  }, [debouncedCode, type, activeTab]);

  return (
    <GlassPanel sx={{ mt: 2, mb: 2, overflow: 'hidden', borderRadius: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          px: 2,
          bgcolor: 'rgba(255, 255, 255, 0.03)',
          height: 48,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flexGrow: 1, letterSpacing: 0.5 }}>
          {title || 'Generated Artifact'}
        </Typography>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            minHeight: 48,
            '& .MuiTabs-indicator': { backgroundColor: 'primary.main' },
          }}
        >
          <Tab
            label="Preview"
            icon={<Visibility sx={{ fontSize: 16 }} />}
            iconPosition="start"
            sx={{
              minHeight: 48,
              py: 0,
              color: 'text.secondary',
              '&.Mui-selected': { color: 'primary.main' },
            }}
          />
          <Tab
            label="Code"
            icon={<Code sx={{ fontSize: 16 }} />}
            iconPosition="start"
            sx={{
              minHeight: 48,
              py: 0,
              color: 'text.secondary',
              '&.Mui-selected': { color: 'primary.main' },
            }}
          />
        </Tabs>
      </Box>

      <Box sx={{ p: 0, bgcolor: 'background.paper', height: 400, overflow: 'hidden' }}>
        {activeTab === 0 && (
          <Box
            sx={{
              height: '100%',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: '#fff',
            }}
          >
            {type === 'html' ? (
              <iframe
                srcDoc={debouncedCode}
                style={{ width: '100%', height: '100%', border: 'none' }}
                sandbox="allow-scripts allow-popups allow-forms"
                title="artifact-preview"
              />
            ) : (
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizedCode,
                }}
                style={{ maxWidth: '100%', maxHeight: '100%', overflow: 'auto' }}
              />
            )}
          </Box>
        )}
        {activeTab === 1 && (
          <Box
            sx={{
              p: 2,
              bgcolor: '#1e1e1e',
              height: '100%',
              overflow: 'auto',
              position: 'relative',
            }}
          >
            <Tooltip title={copied ? t('message.copied', 'Copied') : t('message.copy', 'Copy')}>
              <IconButton
                onClick={handleCopy}
                aria-label={copied ? t('message.copied', 'Copied') : t('message.copy', 'Copy')}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' },
                }}
                size="small"
              >
                {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
              </IconButton>
            </Tooltip>
            <pre
              style={{
                margin: 0,
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: '#d4d4d4',
                whiteSpace: 'pre-wrap',
              }}
            >
              {code}
            </pre>
          </Box>
        )}
      </Box>
    </GlassPanel>
  );
}

export const ArtifactRenderer = memo(ArtifactRendererComponent);
