import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

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
      <h1 className="placeholder-title">{category.name}</h1>
      <p className="placeholder-text">Products coming in Wave 2</p>
      <Link href="/" className="btn-primary">
        Back to Home
      </Link>
    </div>
  );
}
