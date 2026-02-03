// apps/web/src/org/OrgUsageDashboardPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { fetchTopUsers, UsageAnalyticsResponse, TopUserDto } from '../api/usageAnalytics';
import { API_BASE_URL } from '../api/client';
import { BentoGrid } from '../components/ui/kinetic/BentoGrid';
import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { KineticTypography } from '../components/ui/kinetic/KineticTypography';
import { useEcoMode } from '../hooks/useEcoMode';

export const OrgUsageDashboardPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();
  const { isEcoMode } = useEcoMode();

  const [usage, setUsage] = useState<UsageAnalyticsResponse | null>(null);
  const [topUsers, setTopUsers] = useState<TopUserDto[]>([]);
  const [featureFilter, setFeatureFilter] = useState<string>('all');

  useEffect(() => {
    if (!token || !orgId) return;

    // Fetch top users (static)
    fetchTopUsers(token, orgId, {
      feature: featureFilter === 'all' ? undefined : featureFilter
    }).then(t => setTopUsers(t.topUsers));

    // Stream analytics (kinetic)
    let active = true;
    const fetchStream = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/analytics/stream`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (active) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          // Keep the last partial chunk in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
               const jsonStr = line.substring(6);
               if (jsonStr === '"processing"') continue;
               try {
                 const data = JSON.parse(jsonStr);
                 // Check if it's the full analytics object
                 if (data.totals) setUsage(data);
               } catch (e) {
                 console.error('Stream parse error', e);
               }
            }
          }
        }
      } catch (err) {
        console.error('Stream error', err);
      }
    };

    fetchStream();

    return () => {
      active = false;
    };
  }, [orgId, token, featureFilter]);

  const formatCost = (micros: number) => {
    return `$${(micros / 1_000_000).toFixed(4)}`;
  };

  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        height: '100%',
        backgroundColor: 'background.default'
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <AutoAwesomeIcon fontSize="small" />
          <Box>
            <KineticTypography variant="h4" component="h1">Usage & cost dashboard</KineticTypography>
            <Typography variant="caption" color="text.secondary">
              Track token usage and estimated costs across your organization.
            </Typography>
          </Box>
        </Box>
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

      <BentoGrid>
        {usage && (
          <>
            <GlassPanel refractive={!isEcoMode}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Total requests
                </Typography>
                <KineticTypography variant="h3">{usage.totals.requestCount.toLocaleString()}</KineticTypography>
              </CardContent>
            </GlassPanel>
            <GlassPanel refractive={!isEcoMode}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Total tokens
                </Typography>
                <KineticTypography variant="h3">
                  {(usage.totals.inputTokens + usage.totals.outputTokens).toLocaleString()}
                </KineticTypography>
                <Typography variant="caption" color="text.secondary">
                  {usage.totals.inputTokens.toLocaleString()} in ·{' '}
                  {usage.totals.outputTokens.toLocaleString()} out
                </Typography>
              </CardContent>
            </GlassPanel>
            <GlassPanel refractive={!isEcoMode}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Estimated cost
                </Typography>
                <KineticTypography variant="h3">{formatCost(usage.totals.estimatedCostMicros)}</KineticTypography>
              </CardContent>
            </GlassPanel>
          </>
        )}

        <GlassPanel refractive={!isEcoMode} sx={{ gridColumn: '1 / -1', minHeight: 400 }}>
          <CardContent>
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
          </CardContent>
        </GlassPanel>
      </BentoGrid>
    </Box>
  );
};
