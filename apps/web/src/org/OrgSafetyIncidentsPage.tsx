// apps/web/src/org/OrgSafetyIncidentsPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Pagination,
  Radio,
  RadioGroup,
  Typography
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WarningIcon from '@mui/icons-material/Warning';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  fetchModerationIncidents,
  ModerationIncidentDto
} from '../api/moderationIncidents';

export const OrgSafetyIncidentsPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();

  const [items, setItems] = useState<ModerationIncidentDto[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'user' | 'assistant' | 'tool'>('all');
  const [severeOnly, setSevereOnly] = useState(false);

  const gradientBg =
    'radial-gradient(circle at top left, rgba(248,250,252,0.0), transparent 55%), ' +
    'radial-gradient(circle at top right, rgba(248,113,113,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom left, rgba(56,189,248,0.18), transparent 55%)';

  const load = async () => {
    if (!token || !orgId) return;

    const res = await fetchModerationIncidents(token, orgId, {
      page,
      pageSize,
      source: sourceFilter === 'all' ? undefined : sourceFilter,
      severeOnly
    });

    setItems(res.items);
    setTotal(res.total);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, token, page, sourceFilter, severeOnly]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
            <Typography variant="h6">Safety incidents</Typography>
            <Typography variant="caption" color="text.secondary">
              Review messages flagged by moderation, including blocks and warnings.
            </Typography>
          </Box>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <RadioGroup
            row
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
          >
            <FormControlLabel value="all" control={<Radio size="small" />} label="All" />
            <FormControlLabel value="user" control={<Radio size="small" />} label="User" />
            <FormControlLabel
              value="assistant"
              control={<Radio size="small" />}
              label="Assistant"
            />
            <FormControlLabel value="tool" control={<Radio size="small" />} label="Tool" />
          </RadioGroup>

          <FormControlLabel
            control={
              <Radio
                checked={severeOnly}
                onChange={(e) => setSevereOnly(e.target.checked)}
              />
            }
            label="Severe only"
          />
        </Box>
      </Box>

      <Card sx={{ borderRadius: 3, flex: 1, minHeight: 0 }}>
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            height: '100%',
            overflow: 'auto'
          }}
        >
          {items.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No incidents for this filter.
            </Typography>
          )}

          {items.map((inc) => (
            <Box
              key={inc.id}
              sx={{
                p: 1.25,
                borderRadius: 2,
                border: '1px solid',
                borderColor: inc.isSevere ? 'error.light' : 'divider',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={0.5}>
                  {inc.isSevere && <WarningIcon fontSize="small" color="error" />}
                  <Typography variant="body2">
                    {inc.source.toUpperCase()} · {inc.action.toUpperCase()}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {new Date(inc.createdAt).toLocaleString()}
                </Typography>
              </Box>

              {inc.reason && (
                <Typography variant="caption" color="text.secondary">
                  {inc.reason}
                </Typography>
              )}

              <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                {inc.categories.map((c) => (
                  <Chip
                    key={c.category}
                    size="small"
                    label={`${c.category} (${c.score.toFixed(2)})`}
                  />
                ))}
              </Box>

              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                {inc.contentSnippet}
              </Typography>
            </Box>
          ))}

          {totalPages > 1 && (
            <Box display="flex" justifyContent="flex-end" mt={1}>
              <Pagination
                size="small"
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
