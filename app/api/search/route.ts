import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, and, sql, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const pageParam = searchParams.get('page');
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const perPage = 20;
    const offset = (page - 1) * perPage;

    if (!q) {
      return NextResponse.json({ error: 'Query required.' }, { status: 400 });
    }

    // 1. Fetch matching active products count
    const countQuery = await db
      .select({
        count: sql<number>`count(distinct ${schema.products.id})`,
      })
      .from(schema.products)
      .leftJoin(schema.productTags, eq(schema.productTags.productId, schema.products.id))
      .leftJoin(schema.tags, eq(schema.tags.id, schema.productTags.tagId))
      .where(
        and(
          eq(schema.products.status, 'active'),
          sql`to_tsvector('english', ${schema.products.name} || ' ' || COALESCE(${schema.products.shortDescription}, '') || ' ' || COALESCE(${schema.tags.name}, '')) @@ plainto_tsquery('english', ${q})`
        )
      );

    const total = Number(countQuery[0]?.count || 0);

    if (total === 0) {
      return NextResponse.json({
        query: q,
        total: 0,
        page,
        per_page: perPage,
        results: [],
      });
    }

    // 2. Fetch matching products, categories, and primary image
    const results = await db
      .selectDistinct({
        id: schema.products.id,
        name: schema.products.name,
        slug: schema.products.slug,
        base_price: schema.products.basePrice,
        sale_price: schema.products.salePrice,
        gst_rate: schema.products.gstRate,
        createdAt: schema.products.createdAt,
        categoryName: schema.categories.name,
        categorySlug: schema.categories.slug,
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
          sql`to_tsvector('english', ${schema.products.name} || ' ' || COALESCE(${schema.products.shortDescription}, '') || ' ' || COALESCE(${schema.tags.name}, '')) @@ plainto_tsquery('english', ${q})`
        )
      )
      .orderBy(desc(schema.products.createdAt))
      .limit(perPage)
      .offset(offset);

    // Format the response results to match specifications
    const formattedResults = results.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      base_price: row.base_price,
      sale_price: row.sale_price,
      gst_rate: row.gst_rate,
      primary_image: row.primaryImage || null,
      category: row.categorySlug ? {
        name: row.categoryName,
        slug: row.categorySlug,
      } : null,
    }));

    return NextResponse.json({
      query: q,
      total,
      page,
      per_page: perPage,
      results: formattedResults,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
