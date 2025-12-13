// apps/web/src/org/OrgBillingPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Typography
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  fetchBillingPlans,
  fetchOrgSubscription,
  requestPlanChange,
  BillingPlanDto,
  OrgSubscriptionDto
} from '../api/billing';

export const OrgBillingPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();

  const [plans, setPlans] = useState<BillingPlanDto[]>([]);
  const [subscription, setSubscription] = useState<OrgSubscriptionDto | null>(null);

  const gradientBg =
    'radial-gradient(circle at top left, rgba(34,197,94,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(59,130,246,0.18), transparent 55%)';

  const load = async () => {
    if (!token || !orgId) return;
    const [p, s] = await Promise.all([
      fetchBillingPlans(token),
      fetchOrgSubscription(token, orgId)
    ]);
    setPlans(p.plans);
    setSubscription(s.subscription);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, token]);

  const handleChangePlan = async (planId: string) => {
    if (!token || !orgId) return;
    const res = await requestPlanChange(token, orgId, planId);
    // Redirect to PAYTR checkout
    if (typeof window !== 'undefined' && (window as any).PayTR) {
      (window as any).PayTR.Checkout(res.checkoutToken);
    }
  };

  const formatPrice = (minor: number) => {
    return `₺${(minor / 100).toFixed(2)}`;
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
          <Typography variant="h6">Billing & subscription</Typography>
          <Typography variant="caption" color="text.secondary">
            Manage your organization's subscription plan and billing.
          </Typography>
        </Box>
      </Box>

      {subscription && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Current plan
            </Typography>
            <Typography variant="h6">{subscription.plan.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {formatPrice(subscription.plan.monthlyPriceMinor)}/month
            </Typography>
            <Chip
              size="small"
              label={subscription.status}
              sx={{ mt: 1 }}
              color={subscription.status === 'active' ? 'success' : 'default'}
            />
          </CardContent>
        </Card>
      )}

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Available plans
          </Typography>
          <Box display="flex" flexDirection="column" gap={1.5} mt={1}>
            {plans.map((p) => (
              <Box
                key={p.id}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: subscription?.planId === p.id ? 'primary.main' : 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box>
                  <Typography variant="body1">{p.name}</Typography>
                  {p.description && (
                    <Typography variant="body2" color="text.secondary">
                      {p.description}
                    </Typography>
                  )}
                  <Typography variant="h6" sx={{ mt: 0.5 }}>
                    {formatPrice(p.monthlyPriceMinor)}/month
                  </Typography>
                </Box>
                <Button
                  variant={subscription?.planId === p.id ? 'outlined' : 'contained'}
                  disabled={subscription?.planId === p.id}
                  onClick={() => void handleChangePlan(p.id)}
                >
                  {subscription?.planId === p.id ? 'Current plan' : 'Select plan'}
                </Button>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
