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
import { fetchUsageAnalytics, fetchTopUsers, UsageAnalyticsResponse, TopUserDto } from '../api/usageAnalytics';

export const OrgUsageDashboardPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();

  const [usage, setUsage] = useState<UsageAnalyticsResponse | null>(null);
  const [topUsers, setTopUsers] = useState<TopUserDto[]>([]);
  const [featureFilter, setFeatureFilter] = useState<string>('all');

  const gradientBg =
    'radial-gradient(circle at top left, rgba(34,197,94,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(59,130,246,0.18), transparent 55%)';

  const load = async () => {
    if (!token || !orgId) return;

    const [u, t] = await Promise.all([
      fetchUsageAnalytics(token, orgId, {
        feature: featureFilter === 'all' ? undefined : featureFilter
      }),
      fetchTopUsers(token, orgId, {
        feature: featureFilter === 'all' ? undefined : featureFilter
      })
    ]);

    setUsage(u);
    setTopUsers(t.topUsers);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <Typography variant="h6">Usage & cost dashboard</Typography>
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

      {usage && (
        <Box display="flex" gap={2}>
          <Card sx={{ borderRadius: 3, flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Total requests
              </Typography>
              <Typography variant="h4">{usage.totals.requestCount.toLocaleString()}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 3, flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Total tokens
              </Typography>
              <Typography variant="h4">
                {(usage.totals.inputTokens + usage.totals.outputTokens).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {usage.totals.inputTokens.toLocaleString()} in ·{' '}
                {usage.totals.outputTokens.toLocaleString()} out
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 3, flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Estimated cost
              </Typography>
              <Typography variant="h4">{formatCost(usage.totals.estimatedCostMicros)}</Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      <Card sx={{ borderRadius: 3, flex: 1 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Top users
          </Typography>
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
      </Card>
    </Box>
  );
};
