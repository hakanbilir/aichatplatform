import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { login } from '../api/auth';
import { useAuth } from './AuthContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const LoginPage: React.FC = () => {
  const { setAuthFromResponse } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await login({ email, password });
      setAuthFromResponse(resp);
      navigate('/app');
    } catch (err) {
      const message = (err as any)?.message || t('login.loginFailed');
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
      <Paper className="micro-elevated" sx={{ p: 4, width: 380 }}>
        <Typography variant="h5" gutterBottom>
          {t('login.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {t('login.subtitle')}
        </Typography>
        <Box component="form" onSubmit={handleSubmit} mt={2}>
          <TextField
            label={t('login.email')}
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label={t('login.password')}
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <Typography color="error" variant="body2" mt={1}>
              {error}
            </Typography>
          )}
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }} disabled={loading}>
            {loading ? t('login.signingIn') : t('login.signIn')}
          </Button>
        </Box>
        <Box mt={2}>
          <Typography variant="body2">
            {t('login.noAccount')}{' '}
            <Link component={RouterLink} to="/auth/signup">
              {t('login.signUp')}
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

