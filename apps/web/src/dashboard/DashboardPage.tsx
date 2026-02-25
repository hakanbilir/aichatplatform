import React from 'react';
import { Box } from '@mui/material';

import { DashboardBentoGrid } from '../components/dashboard/DashboardBentoGrid';

export const DashboardPage: React.FC = () => {
  return (
    <Box sx={{ height: '100%', overflow: 'hidden' }}>
      <DashboardBentoGrid />
    </Box>
  );
};
