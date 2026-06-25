'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/product/ProductCard';
import Link from 'next/link';

interface Product {
  id: number;
  name: string;
  slug: string;
  base_price: string;
  sale_price: string | null;
  gst_rate: string;
  primary_image: string | null;
  category: {
    name: string;
    slug: string;
  } | null;
}

interface SearchResponse {
  query: string;
  total: number;
  page: number;
  per_page: number;
  results: Product[];
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get('q') || '';
  const pageParam = searchParams.get('page');
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q.trim()) {
      setLoading(false);
      setError('Query required.');
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(q)}&page=${currentPage}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.error || 'Failed to fetch search results');
          });
        }
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [q, currentPage]);

  const handlePageChange = (newPage: number) => {
    router.push(`/search?q=${encodeURIComponent(q)}&page=${newPage}`);
  };

  if (loading) {
    return (
      <div className="search-status-container">
        <div className="search-loading-spinner"></div>
        <p className="search-status-text">Searching for "{q}"...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-status-container">
        <p className="search-error-text">Error: {error}</p>
        <Link href="/" className="btn-primary" style={{ marginTop: '16px' }}>
          Back to Home
        </Link>
      </div>
    );
  }

  const results = data?.results || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="search-results-container">
      {total > 0 ? (
        <>
          <div className="search-header">
            <h1 className="search-title">Search Results</h1>
            <p className="search-subtitle">
              {total} {total === 1 ? 'result' : 'results'} found for "{q}"
            </p>
          </div>

          {/* Product Grid */}
          <div className="search-results-grid">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="pagination-container" aria-label="Search results pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn pagination-prev"
              >
                ✕ Previous
              </button>
              <div className="pagination-pages">
                {Array.from({ length: totalPages }, (_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`pagination-page-btn ${pageNum === currentPage ? 'active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn pagination-next"
              >
                Next ➜
              </button>
            </nav>
          )}
        </>
      ) : (
        <div className="search-empty-state">
          <svg className="search-empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          <h1 className="search-empty-title">No products found</h1>
          <p className="search-empty-text">We couldn't find any matches for "{q}".</p>
          <div className="search-empty-actions">
            <Link href="/" className="btn-primary">
              Browse all products
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <>
      <Header />
      <main style={{ flex: 1, minHeight: 'calc(100vh - 300px)', padding: '40px 0' }}>
        <Suspense fallback={
          <div className="search-status-container">
            <div className="search-loading-spinner"></div>
            <p className="search-status-text">Loading...</p>
          </div>
        }>
          <SearchResultsContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
