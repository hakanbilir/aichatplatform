import React, { useState, useMemo } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar,
  TextField,
  InputAdornment,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useIsMobile } from '../utils/responsive';

export const TopBar: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation('common');
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Extract orgId from current pathname / Mevcut pathname'den orgId'yi çıkar
  const orgId = useMemo(() => {
    const match = location.pathname.match(/\/app\/orgs\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const initials = user?.name?.[0]?.toUpperCase() || user?.email[0]?.toUpperCase() || 'A';

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!orgId || !searchQuery.trim()) return;
    
    // Navigate to inbox page with search query / Arama sorgusu ile inbox sayfasına git
    navigate(`/app/orgs/${orgId}/inbox?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSearchSubmit(event);
    }
  };

  const handleSearchClear = () => {
    setSearchQuery('');
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      className="gradient-header"
      sx={{
        mb: 1,
        transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          py: isMobile ? 1 : 1.5,
        }}
      >
        {/* Logo and app name / Logo ve uygulama adı */}
        <Box display="flex" alignItems="center" gap={1.5} minWidth={0} flex={isMobile ? '1 1 100%' : '0 0 auto'}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 0%, #fff, transparent 60%)',
              border: '1px solid rgba(255,255,255,0.4)',
              flexShrink: 0,
              transition: 'transform 200ms ease, box-shadow 200ms ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              },
            }}
          />
          <Box minWidth={0}>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              sx={{
                fontSize: isMobile ? '0.875rem' : '1rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {t('appName')}
            </Typography>
            {!isMobile && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {t('appSubtitle')}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Search bar (hidden on mobile) / Arama çubuğu (mobilde gizli) */}
        {!isMobile && orgId && (
          <Box flex={1} maxWidth={400} mx={2} component="form" onSubmit={handleSearchSubmit}>
            <TextField
              fullWidth
              size="small"
              placeholder={t('search') || 'Search...'}
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              inputProps={{ 'aria-label': t('search') }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      fontSize="small"
                      sx={{
                        color: searchFocused ? 'primary.main' : 'text.secondary',
                        transition: 'color 200ms ease',
                      }}
                    />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleSearchClear}
                      aria-label={t('clearSearch')}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': { color: 'text.primary' },
                        transition: 'color 200ms ease',
                      }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: searchFocused
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(255,255,255,0.08)',
                  transition: 'background-color 200ms ease, box-shadow 200ms ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.12)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    boxShadow: '0 0 0 2px rgba(124,77,255,0.3)',
                  },
                },
              }}
            />
          </Box>
        )}

        {/* Right side actions / Sağ taraf eylemleri */}
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          flexShrink={0}
          flex={isMobile ? '1 1 100%' : '0 0 auto'}
          justifyContent={isMobile ? 'space-between' : 'flex-end'}
        >
          <LanguageSwitcher />
          {user && !isMobile && (
            <>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: '0.75rem',
                  display: { xs: 'none', sm: 'block' },
                  maxWidth: 150,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.email}
              </Typography>
              <Avatar
                sx={{
                  width: 30,
                  height: 30,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'transform 200ms ease, box-shadow 200ms ease',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  },
                }}
              >
                {initials}
              </Avatar>
            </>
          )}
          <IconButton
            color="inherit"
            size="small"
            onClick={logout}
            title={t('logout')}
            aria-label={t('logout')}
            sx={{
              minWidth: 44,
              minHeight: 44,
              transition: 'transform 200ms ease, background-color 200ms ease',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                transform: 'scale(1.05)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          >
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

