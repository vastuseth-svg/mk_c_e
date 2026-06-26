'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
  requestOtp: (phone: string, name?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string; is_new_user?: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/auth/token/refresh', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.access_token);
        setUser(data.user);
        return data.access_token;
      } else {
        setAccessToken(null);
        setUser(null);
        return null;
      }
    } catch {
      setAccessToken(null);
      setUser(null);
      return null;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid email or password.' };
      }
      setAccessToken(data.access_token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
      });
    } catch {
      console.error('Logout error');
    } finally {
      setAccessToken(null);
      setUser(null);
      router.push('/');
    }
  };

  const requestOtp = async (phone: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to send OTP.' };
      }
      return { success: true, message: data.message };
    } catch {
      return { success: false, error: 'An error occurred.' };
    }
  };

  const verifyOtp = async (phone: string, otp: string) => {
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid OTP.' };
      }
      setAccessToken(data.access_token);
      setUser(data.user);
      return { success: true, is_new_user: data.is_new_user };
    } catch {
      return { success: false, error: 'An error occurred.' };
    }
  };

  // Initial silent refresh
  useEffect(() => {
    const initAuth = async () => {
      await refresh();
      setLoading(false);
    };
    initAuth();
  }, []);

  // Auto-refresh access token every 14 minutes
  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(() => {
      refresh();
    }, 14 * 60 * 1000);
    return () => clearInterval(interval);
  }, [accessToken]);

  return React.createElement(
    AuthContext.Provider,
    { value: { user, accessToken, loading, login, logout, refresh, requestOtp, verifyOtp } },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
