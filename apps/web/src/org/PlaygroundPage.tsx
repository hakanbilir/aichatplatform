// apps/web/src/org/PlaygroundPage.tsx

import React, { useState } from 'react';
import { Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { playgroundComplete } from '../api/playground';

export const PlaygroundPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();

  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  const gradientBg =
    'radial-gradient(circle at top left, rgba(139,92,246,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(59,130,246,0.18), transparent 55%)';

  const handleRun = async () => {
    if (!token || !orgId || !prompt.trim()) return;

    setLoading(true);
    setOutput('');

    try {
      const res = await playgroundComplete(token, orgId, {
        prompt,
        systemPrompt: systemPrompt.trim() || undefined
      });
      setOutput(res.output);
      setLatency(res.latencyMs ?? null);
    } catch (err) {
      setOutput(`Error: ${(err as Error).message}`);
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
        backgroundColor: 'background.default'
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <AutoAwesomeIcon fontSize="small" />
        <Box>
          <Typography variant="h6">Playground</Typography>
          <Typography variant="caption" color="text.secondary">
            Test prompts and models interactively without creating a conversation.
          </Typography>
        </Box>
      </Box>

      <Card sx={{ borderRadius: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          <TextField
            label="System prompt (optional)"
            multiline
            minRows={2}
            fullWidth
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful assistant..."
          />

          <TextField
            label="User prompt"
            multiline
            minRows={4}
            fullWidth
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
          />

          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleRun}
              disabled={loading || !prompt.trim()}
            >
              {loading ? 'Running...' : 'Run'}
            </Button>
          </Box>

          {output && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                backgroundColor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2">Output</Typography>
                {latency !== null && (
                  <Typography variant="caption" color="text.secondary">
                    {latency}ms
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {output}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
