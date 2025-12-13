import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthUser, AuthResponse, MeResponse } from '../api/auth';
import { getMe } from '../api/auth';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  setAuthFromResponse: (resp: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'ai_chat_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const me: MeResponse = await getMe(token);
        if (!cancelled) {
          setUser(me.user);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setToken(null);
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(STORAGE_KEY);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const setAuthFromResponse = (resp: AuthResponse) => {
    setToken(resp.token);
    setUser(resp.user);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, resp.token);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        setAuthFromResponse,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

