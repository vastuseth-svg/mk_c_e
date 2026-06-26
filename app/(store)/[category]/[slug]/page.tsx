import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import CategoryProductListing from '@/components/category/CategoryProductListing';
import ProductDetailView from '@/components/product/ProductDetailView';
import { Metadata } from 'next';

interface UnifiedPageProps {
  params: {
    category: string;
    slug: string;
  };
}

export async function generateMetadata({ params }: UnifiedPageProps): Promise<Metadata> {
  const { category: categorySlug, slug } = params;

  // Find root or parent category
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
    return {};
  }

  // Check if slug is a subcategory
  const [subCategory] = await db
    .select()
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.slug, slug),
        eq(schema.categories.parentId, category.id),
        eq(schema.categories.active, true)
      )
    )
    .limit(1);

  if (subCategory) {
    return {
      title: `${subCategory.metaTitle || subCategory.name} | Cloth Store`,
      description: subCategory.metaDesc || `Explore the latest collections in ${subCategory.name}.`,
    };
  }

  // Check if slug is a product
  const [product] = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.slug, slug),
        eq(schema.products.status, 'active')
      )
    )
    .limit(1);

  if (product) {
    return {
      title: `${product.metaTitle || product.name} | Cloth Store`,
      description: product.metaDescription || product.shortDescription || `Buy ${product.name} online at Cloth Store.`,
    };
  }

  return {};
}

export default async function UnifiedPage({ params }: UnifiedPageProps) {
  const { category: categorySlug, slug } = params;

  // 1. Fetch category by first segment
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

  // 2. Check if slug matches a subcategory under the parent category
  const [subCategory] = await db
    .select()
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.slug, slug),
        eq(schema.categories.parentId, category.id),
        eq(schema.categories.active, true)
      )
    )
    .limit(1);

  if (subCategory) {
    // Render the subcategory product listing
    return (
      <div className="category-page">
        <nav className="breadcrumb" aria-label="breadcrumb">
          <Link href="/">Home</Link>
          <span className="breadcrumb-separator">›</span>
          <Link href={`/${category.slug}`}>{category.name}</Link>
          <span className="breadcrumb-separator">›</span>
          <span>{subCategory.name}</span>
        </nav>
        <h1 className="category-title">{subCategory.name}</h1>
        <CategoryProductListing categorySlug={subCategory.slug} />
      </div>
    );
  }

  // 3. Check if slug matches an active product
  const [product] = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.slug, slug),
        eq(schema.products.status, 'active')
      )
    )
    .limit(1);

  if (!product) {
    notFound();
  }

  // Fetch images for product
  const images = await db
    .select()
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, product.id))
    .orderBy(schema.productImages.displayOrder);

  // Fetch product variants
  const variants = await db
    .select()
    .from(schema.productVariants)
    .where(eq(schema.productVariants.productId, product.id));

  // Breadcrumbs: if product category differs from the root category in segment 1, fetch subcategory
  let breadcrumbs = (
    <nav className="breadcrumb" aria-label="breadcrumb">
      <Link href="/">Home</Link>
      <span className="breadcrumb-separator">›</span>
      <Link href={`/${category.slug}`}>{category.name}</Link>
      <span className="breadcrumb-separator">›</span>
      <span>{product.name}</span>
    </nav>
  );

  if (product.categoryId !== category.id) {
    const [productCategory] = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, product.categoryId))
      .limit(1);

    if (productCategory && productCategory.parentId === category.id) {
      breadcrumbs = (
        <nav className="breadcrumb" aria-label="breadcrumb">
          <Link href="/">Home</Link>
          <span className="breadcrumb-separator">›</span>
          <Link href={`/${category.slug}`}>{category.name}</Link>
          <span className="breadcrumb-separator">›</span>
          <Link href={`/${category.slug}/${productCategory.slug}`}>{productCategory.name}</Link>
          <span className="breadcrumb-separator">›</span>
          <span>{product.name}</span>
        </nav>
      );
    }
  }

  // Format objects for client component
  const formattedProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: {
      name: category.name,
      slug: category.slug,
    },
    short_description: product.shortDescription,
    full_description: product.fullDescription,
    base_price: product.basePrice,
    sale_price: product.salePrice,
    gst_rate: product.gstRate,
    meta_title: product.metaTitle,
    meta_description: product.metaDescription,
  };

  const formattedImages = images.map((img: any) => ({
    url: img.url,
    is_primary: img.isPrimary ?? false,
    display_order: img.displayOrder ?? 0,
    variant_id: img.variantId,
  }));

  const formattedVariants = variants.map((v: any) => {
    const variantImages = images
      .filter((img: any) => img.variantId === v.id)
      .map((img: any) => ({
        url: img.url,
        is_primary: img.isPrimary ?? false,
        display_order: img.displayOrder ?? 0,
      }));

    return {
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      material: v.material,
      price_override: v.priceOverride,
      effective_price: v.priceOverride !== null ? v.priceOverride : (product.salePrice !== null ? product.salePrice : product.basePrice),
      stock: v.stock,
      in_stock: v.stock > 0,
      images: variantImages,
    };
  });

  return (
    <div className="pdp-container">
      {breadcrumbs}
      <ProductDetailView
        product={formattedProduct}
        initialImages={formattedImages}
        variants={formattedVariants}
      />
    </div>
  );
}
