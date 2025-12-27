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
  const { t: tValidation } = useTranslation('validation');
  const { t: tErrors } = useTranslation('errors');

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
    
    // Client-side validation / İstemci tarafı doğrulama
    if (!name.trim()) {
      setError(tValidation('nameRequired') || tValidation('required') || 'Name is required');
      setLoading(false);
      return;
    }
    if (!email.trim()) {
      setError(tValidation('emailRequired') || tValidation('required') || 'Email is required');
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError(tValidation('passwordMinLength') || 'Password must be at least 8 characters');
      setLoading(false);
      return;
    }
    
    try {
      // Convert empty orgName to undefined to match backend schema
      // Boş orgName'i undefined'a çevirerek backend şemasına uygun hale getir
      const resp = await signup({ 
        email: email.trim(), 
        password, 
        name: name.trim(), 
        orgName: orgName.trim() || undefined 
      });
      setAuthFromResponse(resp);
      navigate('/app');
    } catch (err: any) {
      // Extract error message from ApiError structure
      // ApiError yapısından hata mesajını çıkar
      let errorMessage = t('signup.signupFailed');
      
      if (err?.message) {
        const message = err.message;
        // Check if message is a translation key (e.g., "errors.invalidSignupData")
        // Mesajın bir çeviri anahtarı olup olmadığını kontrol et (örn: "errors.invalidSignupData")
        if (message.startsWith('errors.')) {
          const key = message.replace('errors.', '');
          errorMessage = tErrors(key) || message;
        } else {
          errorMessage = message;
        }
      } else if (err?.error) {
        const error = err.error;
        if (error.startsWith('errors.')) {
          const key = error.replace('errors.', '');
          errorMessage = tErrors(key) || error;
        } else {
          errorMessage = error;
        }
      }
      
      // If there are validation details, format them nicely
      // Doğrulama detayları varsa, güzel bir şekilde formatla
      if (err?.details) {
        const details = err.details as Record<string, any>;
        const fieldErrors: string[] = [];
        
        Object.keys(details).forEach((field) => {
          if (details[field]?._errors) {
            fieldErrors.push(`${field}: ${details[field]._errors.join(', ')}`);
          }
        });
        
        if (fieldErrors.length > 0) {
          errorMessage = `${errorMessage}\n${fieldErrors.join('\n')}`;
        }
      }
      
      setError(errorMessage);
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
            <Typography 
              color="error" 
              variant="body2" 
              mt={1}
              sx={{ whiteSpace: 'pre-line' }}
            >
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

