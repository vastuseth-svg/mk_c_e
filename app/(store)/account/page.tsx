'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';

export default function AccountPage() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="auth-btn-spinner" style={{ borderLeftColor: 'var(--color-accent)' }}></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          Please log in to view your personal account settings and order history.
        </p>
        <Link href="/login?redirect=/account" className="btn-primary" style={{ display: 'inline-block', padding: '12px 24px' }}>
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>My Account</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user.name}!</p>
        </div>
        <button 
          onClick={logout}
          style={{
            background: 'none',
            border: '1px solid var(--color-accent)',
            color: 'var(--color-accent)',
            padding: '10px 20px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'var(--transition)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-accent)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-accent)';
          }}
        >
          Log Out
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Profile Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Full Name</span>
              <span style={{ fontSize: '16px', fontWeight: '500' }}>{user.name}</span>
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Email Address</span>
              <span style={{ fontSize: '16px', fontWeight: '500' }}>{user.email}</span>
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Account Role</span>
              <span style={{ fontSize: '16px', fontWeight: '500', textTransform: 'capitalize' }}>{user.role}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
