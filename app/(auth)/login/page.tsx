'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import OtpFlow from '@/components/auth/OtpFlow';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!email.trim() || !password) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);

    try {
      const res = await login(email.trim(), password);

      if (!res.success) {
        throw new Error(res.error || 'Invalid email or password.');
      }

      // Successful login redirect
      const destination = searchParams.get('redirect') || '/account';
      router.push(destination);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && (
        <div className="auth-error-banner" role="alert">
          <span className="error-icon">✕</span>
          <span className="error-message">{error}</span>
        </div>
      )}

      {/* Email Input */}
      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={loading}
          className="form-input"
        />
      </div>

      {/* Password Input */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label htmlFor="password">Password</label>
          <Link href="/forgot-password" className="auth-link-dead" onClick={(e) => e.preventDefault()} style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Forgot?
          </Link>
        </div>
        <div className="password-input-wrapper">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
            className="form-input password-input"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="password-toggle-btn"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            disabled={loading}
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="btn-auth-submit"
      >
        {loading ? (
          <div className="auth-btn-spinner"></div>
        ) : (
          'Log In'
        )}
      </button>

      {/* Register Redirect Link */}
      <div className="auth-footer-links">
        <span>Don't have an account? </span>
        <Link href="/register" className="auth-link">
          Register
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <Link href="/" className="auth-logo">
            Cloth<span className="logo-gold">web</span>
          </Link>
          <h1 className="auth-title">Log in to your account</h1>
          <p className="auth-subtitle">Access your orders, custom fits, and wishlist</p>
        </div>

        {/* Tab selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setLoginMethod('email')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: loginMethod === 'email' ? '2px solid var(--color-accent)' : 'none',
              color: loginMethod === 'email' ? 'var(--color-accent)' : 'var(--text-secondary)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
          >
            Email Login
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod('phone')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: loginMethod === 'phone' ? '2px solid var(--color-accent)' : 'none',
              color: loginMethod === 'phone' ? 'var(--color-accent)' : 'var(--text-secondary)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
          >
            Phone OTP
          </button>
        </div>

        {loginMethod === 'email' ? (
          <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0' }}><div className="auth-btn-spinner" style={{ borderLeftColor: 'var(--color-accent)' }}></div></div>}>
            <LoginForm />
          </Suspense>
        ) : (
          <div>
            <OtpFlow />
            <div className="auth-footer-links" style={{ marginTop: '20px', textAlign: 'center' }}>
              <span>Don't have an account? </span>
              <Link href="/register" className="auth-link">
                Register
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
