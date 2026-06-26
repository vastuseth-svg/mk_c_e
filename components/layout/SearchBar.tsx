'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Suggestion {
  id: number;
  name: string;
  slug: string;
  primary_image: string | null;
  category_slug: string | null;
  category_name: string | null;
}

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchBar({ isOpen, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced API search
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setHighlightedIndex(-1);
      return;
    }

    setLoading(true);
    const controller = new AbortController();

    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShowDropdown(data.length > 0);
          setHighlightedIndex(-1);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Autocomplete fetch error:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setShowDropdown(false);
      setQuery('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    const totalItems = suggestions.length + 1; // suggestions + "See all" item

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        const selected = suggestions[highlightedIndex];
        router.push(`/${selected.category_slug}/${selected.slug}`);
        setShowDropdown(false);
        setQuery('');
        onClose();
      } else if (highlightedIndex === suggestions.length) {
        e.preventDefault();
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        setShowDropdown(false);
        setQuery('');
        onClose();
      }
    }
  };

  return (
    <div ref={containerRef} className={`header-search-form ${isOpen ? 'open' : ''}`} style={{ position: 'relative' }}>
      {/* Autocomplete inline styles */}
      <style>{`
        .autocomplete-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 320px;
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          margin-top: 8px;
          overflow: hidden;
          z-index: 999;
        }
        .suggestion-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-light);
          cursor: pointer;
          transition: var(--transition);
          text-align: left;
          background: none;
          border: none;
          width: 100%;
          color: var(--text-primary);
          font-family: inherit;
        }
        .suggestion-item:hover, .suggestion-item.highlighted {
          background-color: var(--border-light);
        }
        .suggestion-thumbnail {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          object-fit: cover;
          background-color: var(--border-light);
          flex-shrink: 0;
        }
        .suggestion-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }
        .suggestion-name {
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .suggestion-category {
          font-size: 11px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .see-all-item {
          display: block;
          padding: 12px 16px;
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-accent);
          background-color: var(--border-light);
          transition: var(--transition);
          width: 100%;
          border: none;
          cursor: pointer;
          font-family: inherit;
        }
        .see-all-item:hover, .see-all-item.highlighted {
          background-color: var(--border-color);
          color: var(--color-accent-hover);
        }
      `}</style>

      <form onSubmit={handleFormSubmit} style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          className="header-search-input"
          required
          autoComplete="off"
        />
        {loading ? (
          <div className="auth-btn-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderLeftColor: 'var(--color-accent)', margin: '0 4px' }}></div>
        ) : (
          <button type="submit" className="header-search-btn" aria-label="Submit Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        )}
        {isOpen && (
          <button
            type="button"
            className="header-search-close"
            onClick={() => {
              onClose();
              setQuery('');
              setSuggestions([]);
              setShowDropdown(false);
            }}
            aria-label="Close search"
          >
            ✕
          </button>
        )}
      </form>

      {/* Suggestion Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="autocomplete-dropdown">
          {suggestions.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                router.push(`/${item.category_slug}/${item.slug}`);
                setShowDropdown(false);
                setQuery('');
                onClose();
              }}
              className={`suggestion-item ${highlightedIndex === index ? 'highlighted' : ''}`}
            >
              {item.primary_image ? (
                <img
                  src={item.primary_image}
                  alt={item.name}
                  className="suggestion-thumbnail"
                />
              ) : (
                <div className="suggestion-thumbnail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  Cloth
                </div>
              )}
              <div className="suggestion-meta">
                <span className="suggestion-name">{item.name}</span>
                <span className="suggestion-category">{item.category_name || 'Category'}</span>
              </div>
            </button>
          ))}

          {/* See all results item */}
          <button
            type="button"
            onClick={() => {
              router.push(`/search?q=${encodeURIComponent(query.trim())}`);
              setShowDropdown(false);
              setQuery('');
              onClose();
            }}
            className={`see-all-item ${highlightedIndex === suggestions.length ? 'highlighted' : ''}`}
          >
            See all results for "{query.trim()}"
          </button>
        </div>
      )}
    </div>
  );
}
