import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import CategoryProductListing from '@/components/category/CategoryProductListing';

interface CategoryPageProps {
  params: {
    category: string;
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = params;

  const [category] = await db
    .select()
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.slug, categorySlug),
        eq(schema.categories.active, true)
      )
    )
    .limit(1);

  if (!category) {
    notFound();
  }

  return (
    <div className="placeholder-page">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">Home</Link>
        <span className="breadcrumb-separator">›</span>
        <span>{category.name}</span>
      </nav>
      <h1 className="category-title">{category.name}</h1>
      <CategoryProductListing categorySlug={category.slug} />
    </div>
  );
}
