import React, { useEffect, useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Switch,
  FormControlLabel
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchTopUsers, UsageAnalyticsResponse, TopUserDto } from '../api/usageAnalytics';
import { BentoGrid } from '../components/layout/BentoGrid';
import { Panel } from '../components/layout/Panel';
import { KineticTypography } from '../components/ui/KineticTypography';
import { useEcoMode } from '../components/providers/EcoModeContext';
import { API_BASE_URL } from '../api/client';

export const OrgUsageDashboardPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();
  const { isEcoMode, toggleEcoMode } = useEcoMode();

  const [usage, setUsage] = useState<UsageAnalyticsResponse | null>(null);
  const [topUsers, setTopUsers] = useState<TopUserDto[]>([]);
  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const gradientBg =
    'radial-gradient(circle at top left, rgba(34,197,94,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(59,130,246,0.18), transparent 55%)';

  useEffect(() => {
    if (!token || !orgId) return;

    fetchTopUsers(token, orgId, {
      feature: featureFilter === 'all' ? undefined : featureFilter
    })
      .then(t => setTopUsers(t.topUsers))
      .catch(console.error);

    let active = true;
    setLoading(true);

    const streamAnalytics = async () => {
      try {
        const query = featureFilter !== 'all' ? `&feature=${featureFilter}` : '';
        const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/usage/stream?days=30${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = '';

        while (active) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            if (part.startsWith('data: ')) {
              try {
                const msg = JSON.parse(part.substring(6));
                if (msg.type === 'result') {
                  const data = msg.data;
                  setUsage({
                    usage: [],
                    totals: {
                      requestCount: data.completions,
                      inputTokens: data.totals.promptTokens,
                      outputTokens: data.totals.completionTokens,
                      estimatedCostMicros: 0
                    },
                    period: { startDate: data.range.from, endDate: data.range.to }
                  });
                  setLoading(false);
                } else if (msg.type === 'progress') {
                  if (msg.total > 0) {
                     setProgress(Math.round((msg.processed / msg.total) * 100));
                  }
                }
              } catch (e) {
                console.error('Parse error', e);
              }
            }
          }
        }
      } catch (e) {
        console.error('Stream error', e);
        setLoading(false);
      }
    };

    void streamAnalytics();

    return () => { active = false; };
  }, [orgId, token, featureFilter]);

  const formatCost = (micros: number) => {
    return `$${(micros / 1_000_000).toFixed(4)}`;
  };

  return (
    <Box
      sx={{
        p: 2,
        height: '100%',
        backgroundImage: gradientBg,
        backgroundColor: 'background.default',
        overflowY: 'auto'
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <AutoAwesomeIcon fontSize="small" />
          <Box>
            <KineticTypography variant="h4" sx={{ fontWeight: 600 }}>Usage & Cost Dashboard</KineticTypography>
            <Typography variant="caption" color="text.secondary">
              Track token usage and estimated costs across your organization.
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
           {loading && <Typography variant="caption">Analyzing... {progress}%</Typography>}
           <FormControlLabel
              control={<Switch checked={isEcoMode} onChange={toggleEcoMode} />}
              label="Eco Mode"
            />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Feature</InputLabel>
            <Select
              value={featureFilter}
              label="Feature"
              onChange={(e) => setFeatureFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="chat">Chat</MenuItem>
              <MenuItem value="playground">Playground</MenuItem>
              <MenuItem value="experiment">Experiments</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <BentoGrid>
        {usage ? (
          <>
            <Panel sx={{ gridColumn: 'span 1' }}>
              <KineticTypography variant="h6" gutterBottom>
                Total requests
              </KineticTypography>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{usage.totals.requestCount.toLocaleString()}</Typography>
            </Panel>
            <Panel sx={{ gridColumn: 'span 1' }}>
              <KineticTypography variant="h6" gutterBottom>
                Total tokens
              </KineticTypography>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {(usage.totals.inputTokens + usage.totals.outputTokens).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {usage.totals.inputTokens.toLocaleString()} in ·{' '}
                {usage.totals.outputTokens.toLocaleString()} out
              </Typography>
            </Panel>
            <Panel sx={{ gridColumn: 'span 1' }}>
              <KineticTypography variant="h6" gutterBottom>
                Estimated cost
              </KineticTypography>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{formatCost(usage.totals.estimatedCostMicros)}</Typography>
            </Panel>
          </>
        ) : (
             <Panel sx={{ gridColumn: '1 / -1' }}>
                 <Typography>Connecting to real-time stream...</Typography>
             </Panel>
        )}

        <Panel sx={{ gridColumn: '1 / -1' }}>
          <KineticTypography variant="h5" gutterBottom>
            Top users
          </KineticTypography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell align="right">Requests</TableCell>
                <TableCell align="right">Tokens</TableCell>
                <TableCell align="right">Cost</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" color="text.secondary">
                      No usage data yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {topUsers.map((u) => (
                <TableRow key={u.userId}>
                  <TableCell>
                    {u.user?.name || u.user?.email || `User ${u.userId.slice(0, 8)}`}
                  </TableCell>
                  <TableCell align="right">{u.requestCount.toLocaleString()}</TableCell>
                  <TableCell align="right">
                    {(u.inputTokens + u.outputTokens).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">{formatCost(u.estimatedCostMicros)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </BentoGrid>
    </Box>
  );
};
