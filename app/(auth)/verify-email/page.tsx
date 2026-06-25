'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Verification token is missing.');
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data.error || 'Verification failed.');
          });
        }
        return res.json();
      })
      .then(() => {
        setStatus('success');
      })
      .catch((err) => {
        console.error(err);
        setStatus('error');
        setErrorMessage(err.message || 'Invalid or expired verification token.');
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="verify-card-state">
        <div className="verify-spinner"></div>
        <h2 className="verify-title">Verifying your email...</h2>
        <p className="verify-text">Please wait while we activate your account.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="verify-card-state">
        <div className="verify-icon-wrapper success">
          <svg className="verify-status-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 className="verify-title">Email Verified!</h2>
        <p className="verify-text">
          Thank you. Your email address has been successfully verified.
        </p>
        <p className="verify-subtext">
          Your account is now fully active.
        </p>
        <Link href="/" className="btn-primary" style={{ marginTop: '24px' }}>
          Go to Homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="verify-card-state">
      <div className="verify-icon-wrapper error">
        <svg className="verify-status-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
      <h2 className="verify-title">Verification Failed</h2>
      <p className="verify-text text-danger">
        {errorMessage || 'The verification link is invalid or has expired.'}
      </p>
      <p className="verify-subtext">
        Please register again or contact support if this error persists.
      </p>
      <Link href="/" className="btn-primary" style={{ marginTop: '24px' }}>
        Back to Home
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <Link href="/" className="auth-logo">
            Cloth<span className="logo-gold">web</span>
          </Link>
        </div>

        <Suspense fallback={
          <div className="verify-card-state">
            <div className="verify-spinner"></div>
            <h2 className="verify-title">Loading...</h2>
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
