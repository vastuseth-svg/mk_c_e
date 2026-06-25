import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allCategories = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.active, true))
      .orderBy(asc(schema.categories.displayOrder), asc(schema.categories.name));

    const roots = allCategories.filter((c: any) => c.parentId === null);
    const result = roots.map((root: any) => {
      const children = allCategories.filter((c: any) => c.parentId === root.id);
      return {
        id: root.id,
        name: root.name,
        slug: root.slug,
        bannerImage: root.bannerImage,
        children: children.map((child: any) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          children: []
        }))
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
