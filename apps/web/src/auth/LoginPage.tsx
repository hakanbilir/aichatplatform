import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, TextField, Typography, Link, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

import { login } from '../api/auth';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { KineticTypography } from '../components/ui/kinetic/KineticTypography';
import { SpecularButton } from '../components/ui/kinetic/SpecularButton';
import { useEcoMode } from '../hooks/useEcoMode';

import { useAuth } from './AuthContext';

export const LoginPage: React.FC = () => {
  const { setAuthFromResponse } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const { isEcoMode } = useEcoMode();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <GlassPanel
        refractive={!isEcoMode}
        sx={{ p: 4, width: 380 }}
      >
        <KineticTypography variant="h5" gutterBottom component="h1">
          {t('login.title')}
        </KineticTypography>
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
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <TextField
            label={t('login.password')}
            type={showPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    onMouseDown={(e) => e.preventDefault()}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {error && (
            <Typography color="error" variant="body2" mt={1}>
              {error}
            </Typography>
          )}
          <SpecularButton
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
            disabled={loading}
            data-ai-action="login"
          >
            {loading ? t('login.signingIn') : t('login.signIn')}
          </SpecularButton>
        </Box>
        <Box mt={2}>
          <Typography variant="body2">
            {t('login.noAccount')}{' '}
            <Link component={RouterLink} to="/auth/signup">
              {t('login.signUp')}
            </Link>
          </Typography>
        </Box>
      </GlassPanel>
    </Box>
  );
};
