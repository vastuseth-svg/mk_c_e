'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NavMenu from './NavMenu';
import { useAuth } from '@/lib/useAuth';
import SearchBar from './SearchBar';

interface SubCategory {
  id: number;
  name: string;
  slug: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  children: SubCategory[];
}

export default function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(err => console.error('Error fetching categories in header:', err));
  }, []);

  return (
    <header className="header-container">
      <div className="header-content">
        <Link href="/" className="logo-link">
          Cloth<span className="logo-gold">web</span>
        </Link>

        {/* Desktop Nav */}
        <NavMenu />

        {/* Action icons / Mobile Toggle */}
        <div className="header-actions">
          {/* Active Search Form */}
          <SearchBar isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

          {!searchOpen && (
            <button 
              className="header-action-btn" 
              onClick={() => setSearchOpen(true)}
              aria-label="Open Search"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          )}

          {/* User / Auth Dropdown */}
          <div className="nav-item" style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', height: 'auto' }}>
            <button 
              className="header-action-btn" 
              aria-label="Account"
              onClick={() => router.push(user ? '/account' : '/login')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>
            <div className="dropdown-menu" style={{ width: '180px', transform: 'translateX(-70%) translateY(10px)' }}>
              {user ? (
                <>
                  <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Hi, {user.name.split(' ')[0]}
                  </div>
                  <Link href="/account" className="dropdown-item">
                    My Account
                  </Link>
                  <button 
                    onClick={() => logout()} 
                    className="dropdown-item" 
                    style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="dropdown-item">
                    Login
                  </Link>
                  <Link href="/register" className="dropdown-item">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Cart Icon Placeholder */}
          <button className="header-action-btn" aria-label="Cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </button>

          {/* Mobile Menu Button */}
          <button 
            className="mobile-nav-toggle" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <div className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
        {categories.map(category => (
          <div key={category.id} className="mobile-nav-item">
            <Link 
              href={`/${category.slug}`} 
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              {category.name}
            </Link>
            {category.children.length > 0 && (
              <div className="mobile-sub-menu">
                {category.children.map(sub => (
                  <Link 
                    key={sub.id} 
                    href={`/${category.slug}/${sub.slug}`} 
                    className="mobile-sub-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </header>
  );
}
