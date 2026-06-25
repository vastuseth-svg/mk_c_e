import React from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { db, schema } from '@/lib/db';
import { eq, and, isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch active root categories
  const rootCategories = await db
    .select()
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.active, true),
        isNull(schema.categories.parentId)
      )
    )
    .orderBy(schema.categories.displayOrder);

  return (
    <>
      <Header />
      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <h2 className="hero-subtitle">New Collection 2026</h2>
            <h1 className="hero-title">Timeless Elegance & Comfort</h1>
            <p className="hero-description">
              Discover our curated range of premium Indian wear, fine fabrics, and modern traditional clothing for every occasion.
            </p>
            <Link href="/womens-wear" className="btn-accent">
              Explore Women's Wear
            </Link>
          </div>
        </section>

        {/* Categories Section */}
        <section>
          <h2 className="section-title">Shop by Category</h2>
          <div className="grid-categories">
            {rootCategories.map((category: any) => (
              <Link 
                href={`/${category.slug}`} 
                key={category.id} 
                className="category-card"
                style={{ 
                  background: category.slug === 'womens-wear' 
                    ? 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url("https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop") center/cover no-repeat'
                    : category.slug === 'mens-wear'
                    ? 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url("https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop") center/cover no-repeat'
                    : category.slug === 'kids-wear'
                    ? 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url("https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=800&auto=format&fit=crop") center/cover no-repeat'
                    : 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url("https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?q=80&w=800&auto=format&fit=crop") center/cover no-repeat'
                }}
              >
                <div className="category-card-overlay"></div>
                <div className="category-card-content">
                  <h3 className="category-card-title">{category.name}</h3>
                  <span className="category-card-link">Explore Now</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
