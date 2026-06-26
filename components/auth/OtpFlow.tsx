'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

function OtpForm() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Timer states
  const [timer, setTimer] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  const { requestOtp, verifyOtp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const formattedPhone = `+91${phone.trim()}`;

  // Countdown timer for OTP expiration (5 mins)
  useEffect(() => {
    if (step !== 2 || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timer]);

  // Resend cooldown timer (30 seconds)
  useEffect(() => {
    if (step !== 2 || canResend || resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, canResend, resendTimer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // Validate 10-digit number
    const phoneClean = phone.trim();
    if (!/^\d{10}$/.test(phoneClean)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    const res = await requestOtp(formattedPhone, name.trim() || undefined);
    setLoading(false);

    if (res.success) {
      setMessage(res.message || 'OTP sent successfully.');
      setStep(2);
      setTimer(300);
      setCanResend(false);
      setResendTimer(30);
    } else {
      setError(res.error || 'Failed to send OTP.');
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setError(null);
    setMessage(null);
    setOtp('');

    setLoading(true);
    const res = await requestOtp(formattedPhone, name.trim() || undefined);
    setLoading(false);

    if (res.success) {
      setMessage(res.message || 'OTP resent successfully.');
      setTimer(300);
      setCanResend(false);
      setResendTimer(30);
    } else {
      setError(res.error || 'Failed to resend OTP.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    if (timer <= 0) {
      setError('OTP has expired. Please request a new one.');
      return;
    }

    setLoading(true);
    const res = await verifyOtp(formattedPhone, otp.trim());
    setLoading(false);

    if (res.success) {
      const destination = searchParams.get('redirect') || '/account';
      router.push(destination);
    } else {
      setError(res.error || 'Invalid OTP.');
    }
  };

  // Mask phone number for display (+91 XXXXXX5678)
  const getMaskedPhone = () => {
    const p = phone.trim();
    return `+91 XXXXXX${p.substring(6)}`;
  };

  // Format timer seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="otp-flow-wrapper">
      {error && (
        <div className="auth-error-banner" role="alert" style={{ marginBottom: '20px' }}>
          <span className="error-icon">✕</span>
          <span className="error-message">{error}</span>
        </div>
      )}

      {message && (
        <div className="auth-success-banner" role="status" style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: 'rgba(197, 160, 89, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)', display: 'flex', gap: '8px', fontSize: '14px', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>✓</span>
          <span>{message}</span>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="auth-form">
          {/* Name Field */}
          <div className="form-group">
            <label htmlFor="otp-name">Full Name (New Users Only)</label>
            <input
              id="otp-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Verma"
              disabled={loading}
              className="form-input"
            />
          </div>

          {/* Phone Input */}
          <div className="form-group">
            <label htmlFor="otp-phone">Mobile Number</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', padding: '12px 8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--border-light)' }}>
                +91
              </span>
              <input
                id="otp-phone"
                type="tel"
                pattern="[0-9]*"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                required
                disabled={loading}
                className="form-input"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-auth-submit">
            {loading ? <div className="auth-btn-spinner"></div> : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="auth-form">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              OTP sent to <strong>{getMaskedPhone()}</strong>
            </p>
            <button 
              type="button" 
              onClick={() => setStep(1)} 
              disabled={loading}
              style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '13px', marginTop: '4px', textDecoration: 'underline' }}
            >
              Change number
            </button>
          </div>

          {/* OTP Digit Input */}
          <div className="form-group">
            <label htmlFor="otp-code" style={{ textAlign: 'center' }}>Enter 6-Digit OTP</label>
            <input
              id="otp-code"
              type="text"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              required
              disabled={loading}
              className="form-input"
              style={{
                letterSpacing: '0.6em',
                textAlign: 'center',
                fontSize: '24px',
                fontWeight: '600',
                padding: '12px',
                marginTop: '8px'
              }}
            />
          </div>

          {/* Expiration Countdown */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            <span>
              {timer > 0 ? (
                <>Expires in: <strong style={{ color: 'var(--text-primary)' }}>{formatTime(timer)}</strong></>
              ) : (
                <span style={{ color: 'red', fontWeight: '600' }}>OTP expired</span>
              )}
            </span>

            {/* Resend Cooldown */}
            <span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}
                >
                  Resend OTP
                </button>
              ) : (
                <>Resend in: <strong>{resendTimer}s</strong></>
              )}
            </span>
          </div>

          <button type="submit" disabled={loading || timer <= 0} className="btn-auth-submit" style={{ marginTop: '16px' }}>
            {loading ? <div className="auth-btn-spinner"></div> : 'Verify & Log In'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function OtpFlow() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0' }}><div className="auth-btn-spinner" style={{ borderLeftColor: 'var(--color-accent)' }}></div></div>}>
      <OtpForm />
    </Suspense>
  );
}
