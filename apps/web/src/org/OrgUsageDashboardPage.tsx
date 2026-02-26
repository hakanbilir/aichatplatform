// apps/web/src/org/OrgUsageDashboardPage.tsx

import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import DataObjectIcon from '@mui/icons-material/DataObject';
import StorageIcon from '@mui/icons-material/Storage';
import { useParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import {
  UsageAnalyticsResponse,
  TopUserDto,
  streamUsageAnalytics,
  streamTopUsers,
} from '../api/usageAnalytics';
import { BentoGrid } from '../components/ui/kinetic/BentoGrid';
import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { KineticTypography } from '../components/ui/kinetic/KineticTypography';
import { useEcoMode } from '../hooks/useEcoMode';
import {
  MetricCard,
  TimeSeriesChart,
  DataGrid,
  DataGridColumn,
  TimeSeriesDataPoint,
} from '../components/dashboard';

type AugmentedTopUser = TopUserDto & { totalTokens: number };

/**
 * Main Dashboard Refactor: Bento Grid Layout + Kinetic Glass
 */
export const OrgUsageDashboardPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();
  const { isEcoMode } = useEcoMode();

  const [usage, setUsage] = useState<UsageAnalyticsResponse | null>(null);
  const [topUsers, setTopUsers] = useState<TopUserDto[]>([]);
  const [featureFilter, setFeatureFilter] = useState<string>('all');

  useEffect(() => {
    if (!token || !orgId) return;

    const controller = new AbortController();

    // Stream Top Users
    void streamTopUsers(
      token,
      orgId,
      (data) => {
        if (data.topUsers) setTopUsers(data.topUsers);
      },
      (err) => console.error('TopUsers Stream error', err),
      { feature: featureFilter === 'all' ? undefined : featureFilter },
      controller.signal,
    );

    // Stream Usage Analytics
    void streamUsageAnalytics(
      token,
      orgId,
      (data) => {
        if (data.totals || data.usage) {
          setUsage((prev) => (prev ? { ...prev, ...data } : data));
        }
      },
      (err) => console.error('Usage Stream error', err),
      { feature: featureFilter === 'all' ? undefined : featureFilter },
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [orgId, token, featureFilter]);

  const formatCost = (micros: number) => {
    return `$${(micros / 1_000_000).toFixed(4)}`;
  };

  // Prepare chart data
  const chartData = useMemo<TimeSeriesDataPoint[]>(() => {
    if (!usage || !usage.usage) return [];

    // Sort by date just in case
    return [...usage.usage]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        timestamp: d.date,
        requestCount: d.requestCount,
        totalTokens: d.inputTokens + d.outputTokens,
        estimatedCost: d.estimatedCostMicros / 1_000_000,
      }));
  }, [usage]);

  // Columns for DataGrid
  const columns: DataGridColumn<AugmentedTopUser>[] = [
    {
      key: 'userId', // Use userId as key for sorting, but render user name
      label: 'User',
      render: (_, row) => row.user?.name || row.user?.email || `User ${row.userId.slice(0, 8)}`,
      sortable: true,
    },
    {
      key: 'requestCount',
      label: 'Requests',
      align: 'right',
      sortable: true,
      render: (val) => val.toLocaleString(),
    },
    {
      key: 'totalTokens', // Custom key for sorting
      label: 'Total Tokens',
      align: 'right',
      sortable: true,
      render: (val) => val.toLocaleString(),
    },
    {
      key: 'estimatedCostMicros',
      label: 'Cost',
      align: 'right',
      sortable: true,
      render: (val) => formatCost(val),
    },
  ];

  // Augment data for sorting
  const augmentedTopUsers = useMemo(() => {
    return topUsers.map((u) => ({
      ...u,
      totalTokens: u.inputTokens + u.outputTokens,
    }));
  }, [topUsers]);

  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        height: '100%',
        backgroundColor: 'background.default',
        overflowY: 'auto',
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <AutoAwesomeIcon fontSize="small" color="primary" />
          <Box>
            <KineticTypography variant="h4" component="h1">
              Usage & cost dashboard
            </KineticTypography>
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
        {/* Metric Cards */}
        {usage && (
          <>
            <MetricCard
              label="Total Requests"
              value={usage.totals.requestCount}
              icon={<StorageIcon fontSize="large" sx={{ opacity: 0.7 }} />}
              gradientVariant={1}
            />
            <MetricCard
              label="Total Tokens"
              value={(usage.totals.inputTokens + usage.totals.outputTokens).toLocaleString()}
              secondaryValue={`${usage.totals.inputTokens.toLocaleString()} in · ${usage.totals.outputTokens.toLocaleString()} out`}
              icon={<DataObjectIcon fontSize="large" sx={{ opacity: 0.7 }} />}
              gradientVariant={2}
            />
            <MetricCard
              label="Estimated Cost"
              value={formatCost(usage.totals.estimatedCostMicros)}
              icon={<RequestQuoteIcon fontSize="large" sx={{ opacity: 0.7 }} />}
              gradientVariant={3}
            />
          </>
        )}

        {/* Time Series Chart */}
        {usage?.usage && usage.usage.length > 0 && (
          <GlassPanel
            refractive={!isEcoMode}
            sx={{
              gridColumn: '1 / -1',
              minHeight: 400,
              p: 2,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box mb={2}>
              <KineticTypography variant="h6">Usage Trends</KineticTypography>
              <Typography variant="caption" color="text.secondary">
                Daily request volume and token usage
              </Typography>
            </Box>
            <Box flex={1}>
              <TimeSeriesChart
                data={chartData}
                dataKeys={['requestCount', 'totalTokens']}
                colors={['#7C4DFF', '#00E5FF']}
                formatXAxis={(val) =>
                  new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                }
              />
            </Box>
          </GlassPanel>
        )}

        {/* Top Users Grid */}
        <GlassPanel refractive={!isEcoMode} sx={{ gridColumn: '1 / -1', minHeight: 400 }}>
          <CardContent>
            <Box mb={2}>
              <KineticTypography variant="h5" gutterBottom>
                Top users
              </KineticTypography>
              <Typography variant="caption" color="text.secondary">
                Highest usage by user
              </Typography>
            </Box>

            <DataGrid
              data={augmentedTopUsers}
              columns={columns}
              initialSortColumn="estimatedCostMicros"
              initialSortDirection="desc"
              rowsPerPageOptions={[5, 10, 25, 50]}
              defaultRowsPerPage={5}
              emptyMessage="No usage data available for this period."
            />
          </CardContent>
        </GlassPanel>
      </BentoGrid>
    </Box>
  );
};
