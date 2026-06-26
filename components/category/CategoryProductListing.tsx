'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/product/ProductCard';

interface Product {
  id: number;
  name: string;
  slug: string;
  base_price: string;
  sale_price: string | null;
  gst_rate: string;
  primary_image: string | null;
  on_sale: boolean;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface CategoryProductListingProps {
  categorySlug: string;
}

export default function CategoryProductListing({ categorySlug }: CategoryProductListingProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = parseInt(searchParams.get('per_page') || '24', 10);
  const sort = searchParams.get('sort') || 'newest';

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const res = await fetch(`/api/categories/${categorySlug}/products?page=${page}&per_page=${perPage}&sort=${sort}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setProducts(data.products || []);
        setCategory(data.category || null);
        setTotal(data.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [categorySlug, page, perPage, sort]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', e.target.value);
    params.set('page', '1'); // Reset to page 1 on sort change
    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="category-listing-container">
      {/* Header and Controls */}
      <div className="category-listing-header">
        <div className="sort-control">
          <label htmlFor="sort">Sort by:</label>
          <select id="sort" value={sort} onChange={handleSortChange}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="loading-spinner">Loading products...</div>
      ) : products.length > 0 ? (
        <>
          <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  ...product,
                  category: category ? { name: category.name, slug: category.slug } : null,
                }}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
              <button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="btn-secondary"
              >
                Previous
              </button>
              <span className="page-info">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <p>No products in this category yet.</p>
        </div>
      )}
    </div>
  );
}
