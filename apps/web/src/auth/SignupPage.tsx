import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { signup } from '../api/auth';
import { useAuth } from './AuthContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const SignupPage: React.FC = () => {
  const { setAuthFromResponse } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await signup({ email, password, name, orgName: orgName || undefined });
      setAuthFromResponse(resp);
      navigate('/app');
    } catch (err) {
      const message = (err as any)?.message || t('signup.signupFailed');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      className="gradient-shell"
      position="relative"
    >
      {/* Language Switcher in top-right corner / Sağ üst köşede dil değiştirici */}
      <Box
        position="absolute"
        top={16}
        right={16}
      >
        <LanguageSwitcher />
      </Box>
      <Paper className="micro-elevated" sx={{ p: 4, width: 420 }}>
        <Typography variant="h5" gutterBottom>
          {t('signup.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {t('signup.subtitle')}
        </Typography>
        <Box component="form" onSubmit={handleSubmit} mt={2}>
          <TextField
            label={t('signup.fullName')}
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            label={t('signup.email')}
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label={t('signup.password')}
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <TextField
            label={t('signup.workspaceName')}
            fullWidth
            margin="normal"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
          />
          {error && (
            <Typography color="error" variant="body2" mt={1}>
              {error}
            </Typography>
          )}
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }} disabled={loading}>
            {loading ? t('signup.creating') : t('signup.signUp')}
          </Button>
        </Box>
        <Box mt={2}>
          <Typography variant="body2">
            {t('signup.hasAccount')}{' '}
            <Link component={RouterLink} to="/auth/login">
              {t('signup.signIn')}
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

