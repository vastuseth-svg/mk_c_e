'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

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

export default function NavMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load categories', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <nav className="nav-menu">
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Loading...</span>
      </nav>
    );
  }

  return (
    <nav className="nav-menu">
      {categories.map(category => (
        <div key={category.id} className="nav-item">
          <Link href={`/${category.slug}`} className="nav-link">
            {category.name}
            {category.children.length > 0 && (
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '2px', opacity: 0.8 }}>
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </Link>
          {category.children.length > 0 && (
            <div className="dropdown-menu">
              {category.children.map(sub => (
                <Link key={sub.id} href={`/${category.slug}/${sub.slug}`} className="dropdown-item">
                  {sub.name}
                  <span>→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
