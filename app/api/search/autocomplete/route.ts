import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    const sanitizedQ = q.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    if (!sanitizedQ) {
      return NextResponse.json([]);
    }

    let results: any[] = [];

    try {
      // 1. Try full-text search with suffix prefix tokens, e.g. "kur" -> "kur:*"
      const tsQuery = sanitizedQ.split(/\s+/).map(t => `${t}:*`).join(' & ');

      results = await db
        .selectDistinct({
          id: schema.products.id,
          name: schema.products.name,
          slug: schema.products.slug,
          categorySlug: schema.categories.slug,
          categoryName: schema.categories.name,
          primaryImage: schema.productImages.url,
        })
        .from(schema.products)
        .leftJoin(schema.productTags, eq(schema.productTags.productId, schema.products.id))
        .leftJoin(schema.tags, eq(schema.tags.id, schema.productTags.tagId))
        .leftJoin(schema.categories, eq(schema.categories.id, schema.products.categoryId))
        .leftJoin(
          schema.productImages,
          and(
            eq(schema.productImages.productId, schema.products.id),
            eq(schema.productImages.isPrimary, true)
          )
        )
        .where(
          and(
            eq(schema.products.status, 'active'),
            sql`to_tsvector('english', ${schema.products.name} || ' ' || COALESCE(${schema.products.shortDescription}, '') || ' ' || COALESCE(${schema.tags.name}, '')) @@ to_tsquery('english', ${tsQuery})`
          )
        )
        .limit(5);
    } catch {
      // 2. Fallback: case-insensitive ILIKE query
      results = await db
        .selectDistinct({
          id: schema.products.id,
          name: schema.products.name,
          slug: schema.products.slug,
          categorySlug: schema.categories.slug,
          categoryName: schema.categories.name,
          primaryImage: schema.productImages.url,
        })
        .from(schema.products)
        .leftJoin(schema.categories, eq(schema.categories.id, schema.products.categoryId))
        .leftJoin(
          schema.productImages,
          and(
            eq(schema.productImages.productId, schema.products.id),
            eq(schema.productImages.isPrimary, true)
          )
        )
        .where(
          and(
            eq(schema.products.status, 'active'),
            sql`${schema.products.name} ILIKE ${'%' + sanitizedQ + '%'}`
          )
        )
        .limit(5);
    }

    const formatted = results.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      primary_image: row.primaryImage || null,
      category_slug: row.categorySlug || null,
      category_name: row.categoryName || null,
    }));

    return NextResponse.json(formatted);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
