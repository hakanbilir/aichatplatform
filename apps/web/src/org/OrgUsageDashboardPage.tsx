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
  Typography
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchTopUsers, subscribeToUsageAnalytics, UsageAnalyticsResponse, TopUserDto } from '../api/usageAnalytics';
import { BentoGrid } from '../components/ui/kinetic/BentoGrid';
import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { KineticTypography } from '../components/ui/kinetic/KineticTypography';
import { SpecularButton } from '../components/ui/kinetic/SpecularButton';

export const OrgUsageDashboardPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();

  const [usage, setUsage] = useState<UsageAnalyticsResponse | null>(null);
  const [topUsers, setTopUsers] = useState<TopUserDto[]>([]);
  const [featureFilter, setFeatureFilter] = useState<string>('all');

  useEffect(() => {
    if (!token || !orgId) return;

    // Load static data (Top Users)
    fetchTopUsers(token, orgId, {
      feature: featureFilter === 'all' ? undefined : featureFilter
    }).then(t => setTopUsers(t.topUsers));

    // Subscribe to Usage Stream
    const unsubscribe = subscribeToUsageAnalytics(token, orgId, (data) => {
       if (data.type === 'initial') {
          // Calculate totals from rows
          const rows = data.usage || [];
          const totals = rows.reduce((acc: any, curr: any) => ({
             requestCount: acc.requestCount + curr.requestCount,
             inputTokens: acc.inputTokens + curr.inputTokens,
             outputTokens: acc.outputTokens + curr.outputTokens,
             estimatedCostMicros: acc.estimatedCostMicros + curr.estimatedCostMicros
          }), { requestCount: 0, inputTokens: 0, outputTokens: 0, estimatedCostMicros: 0 });

          setUsage({ usage: rows, totals, period: { startDate: '', endDate: '' } });
       }
       // Handle other event types like 'heartbeat' or 'update' if implemented
    });

    return () => unsubscribe();
  }, [orgId, token, featureFilter]);

  const formatCost = (micros: number) => {
    return `$${(micros / 1_000_000).toFixed(4)}`;
  };

  return (
    <Box sx={{ p: 4, height: '100%', overflowY: 'auto' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
             <AutoAwesomeIcon fontSize="large" sx={{ opacity: 0.7 }} />
             <KineticTypography variant="h1">Usage & Cost</KineticTypography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Real-time kinetic tracking of token usage.
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
           <SpecularButton onClick={() => window.location.reload()} style={{ padding: '8px 24px', color: 'white', fontWeight: 500 }}>
              Refresh View
           </SpecularButton>
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
        {usage && (
          <>
            <GlassPanel>
              <Box p={3}>
                <Typography variant="subtitle2" gutterBottom color="text.secondary">Total Requests</Typography>
                <KineticTypography variant="h2">
                   {usage.totals.requestCount.toLocaleString()}
                </KineticTypography>
              </Box>
            </GlassPanel>

            <GlassPanel>
              <Box p={3}>
                <Typography variant="subtitle2" gutterBottom color="text.secondary">Total Tokens</Typography>
                <KineticTypography variant="h2">
                  {(usage.totals.inputTokens + usage.totals.outputTokens).toLocaleString()}
                </KineticTypography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {usage.totals.inputTokens.toLocaleString()} in · {usage.totals.outputTokens.toLocaleString()} out
                </Typography>
              </Box>
            </GlassPanel>

            <GlassPanel>
               <Box p={3}>
                 <Typography variant="subtitle2" gutterBottom color="text.secondary">Estimated Cost</Typography>
                 <KineticTypography variant="h2">
                   {formatCost(usage.totals.estimatedCostMicros)}
                 </KineticTypography>
               </Box>
            </GlassPanel>
          </>
        )}

        {/* Large panel for Top Users spanning full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <GlassPanel>
             <Box p={3}>
               <Typography variant="h6" gutterBottom>Top Users</Typography>
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
                      <TableCell colSpan={4}>No usage data yet.</TableCell>
                    </TableRow>
                  )}
                  {topUsers.map((u) => (
                    <TableRow key={u.userId}>
                      <TableCell>{u.user?.name || u.user?.email || `User ${u.userId.slice(0, 8)}`}</TableCell>
                      <TableCell align="right">{u.requestCount.toLocaleString()}</TableCell>
                      <TableCell align="right">{(u.inputTokens + u.outputTokens).toLocaleString()}</TableCell>
                      <TableCell align="right">{formatCost(u.estimatedCostMicros)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
               </Table>
             </Box>
          </GlassPanel>
        </div>
      </BentoGrid>
    </Box>
  );
};
