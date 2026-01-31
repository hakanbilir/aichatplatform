// apps/web/src/org/OrgUsageDashboardPage.tsx

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
import { streamUsageAnalytics, fetchTopUsers, UsageAnalyticsResponse, TopUserDto } from '../api/usageAnalytics';
import { BentoGrid, BentoItem } from '../components/ui/kinetic/BentoGrid';
import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { KineticTypography } from '../components/ui/kinetic/KineticTypography';
import { RefractionFilter } from '../components/ui/RefractionFilter';
import '../../styles/theme2026.css';

export const OrgUsageDashboardPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();

  const [usage, setUsage] = useState<UsageAnalyticsResponse | null>(null);
  const [topUsers, setTopUsers] = useState<TopUserDto[]>([]);
  const [featureFilter, setFeatureFilter] = useState<string>('all');

  useEffect(() => {
    if (!token || !orgId) return;

    // Load top users (standard fetch)
    fetchTopUsers(token, orgId, { feature: featureFilter === 'all' ? undefined : featureFilter })
      .then(t => setTopUsers(t.topUsers))
      .catch(console.error);

    // Stream usage
    const abort = streamUsageAnalytics(
        token,
        orgId,
        { feature: featureFilter === 'all' ? undefined : featureFilter },
        (data) => setUsage(data),
        (err) => console.error('Stream error', err)
    );

    return () => abort();
  }, [orgId, token, featureFilter]);

  const formatCost = (micros: number) => {
    return `$${(micros / 1_000_000).toFixed(4)}`;
  };

  return (
    <Box sx={{ p: 4, height: '100%', overflow: 'auto' }}>
       <RefractionFilter />
       <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
        <Box display="flex" alignItems="center" gap={1}>
          <AutoAwesomeIcon fontSize="large" sx={{ color: 'primary.main' }} />
          <Box>
            <KineticTypography variant="h4" fontWeight="bold">Usage & cost dashboard</KineticTypography>
            <Typography variant="body1" color="text.secondary">
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
        {/* Large Summary Cards */}
         <BentoItem colSpan={4} rowSpan={1}>
             <GlassPanel variant="heavy" sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="subtitle2" gutterBottom>Total requests</Typography>
                <KineticTypography variant="h2">
                    {usage ? usage.totals.requestCount.toLocaleString() : '...'}
                </KineticTypography>
             </GlassPanel>
         </BentoItem>

         <BentoItem colSpan={4} rowSpan={1}>
            <GlassPanel variant="heavy" sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
               <Typography variant="subtitle2" gutterBottom>Total tokens</Typography>
                <KineticTypography variant="h2">
                    {usage ? (usage.totals.inputTokens + usage.totals.outputTokens).toLocaleString() : '...'}
                </KineticTypography>
                <Typography variant="caption" color="text.secondary">
                    {usage ? `${usage.totals.inputTokens.toLocaleString()} in · ${usage.totals.outputTokens.toLocaleString()} out` : ''}
                </Typography>
            </GlassPanel>
         </BentoItem>

         <BentoItem colSpan={4} rowSpan={1}>
            <GlassPanel variant="heavy" sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
               <Typography variant="subtitle2" gutterBottom>Estimated cost</Typography>
                <KineticTypography variant="h2">
                    {usage ? formatCost(usage.totals.estimatedCostMicros) : '...'}
                </KineticTypography>
            </GlassPanel>
         </BentoItem>

        {/* Top Users Table - Full Width */}
         <BentoItem colSpan={12} rowSpan={2}>
            <GlassPanel variant="default" sx={{ height: '100%', p: 3 }}>
                 <Typography variant="h6" gutterBottom>Top users</Typography>
                 <Table size="medium">
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
                                <Typography variant="body2" color="text.secondary">No usage data yet.</Typography>
                            </TableCell>
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
            </GlassPanel>
         </BentoItem>
      </BentoGrid>
    </Box>
  );
};
