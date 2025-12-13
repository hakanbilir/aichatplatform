import React, { useEffect, useState } from 'react';
import { Box, MenuItem, Select, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { OrganizationSummary } from '../api/auth';
import { getOrganizations } from '../api/auth';
import { useAuth } from '../auth/AuthContext';

export const OrgSwitcher: React.FC = () => {
  const { t } = useTranslation(['common', 'org']);
  const { token } = useAuth();
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      if (!token) return; // Type guard / Tip koruması
      try {
        const resp = await getOrganizations(token);
        if (!cancelled) setOrgs(resp.organizations);
      } catch {
        // ignore
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Box mb={2}>
      <Typography variant="caption" color="rgba(255,255,255,0.75)">
        {t('workspace', { ns: 'common' })}
      </Typography>
      <Select
        fullWidth
        size="small"
        value={orgs[0]?.id ?? ''}
        sx={{
          mt: 0.5,
          fontSize: 13,
          '& .MuiSelect-select': {
            paddingY: 0.8,
          },
        }}
        displayEmpty
        renderValue={(value) => {
          if (!value || orgs.length === 0) {
            return <span>{t('members.noOrgs')}</span>;
          }
          const org = orgs.find((o) => o.id === value) ?? orgs[0];
          return `${org.name}`;
        }}
      >
        {orgs.map((org) => (
          <MenuItem key={org.id} value={org.id}>
            {org.name}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
};

