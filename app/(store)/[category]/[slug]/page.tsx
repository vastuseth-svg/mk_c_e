import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import ImageGallery from '@/components/product/ImageGallery';
import ProductSchema from '@/components/product/ProductSchema';
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
    // Render the subcategory placeholder page
    return (
      <div className="placeholder-page">
        <nav className="breadcrumb" aria-label="breadcrumb">
          <Link href="/">Home</Link>
          <span className="breadcrumb-separator">›</span>
          <Link href={`/${category.slug}`}>{category.name}</Link>
          <span className="breadcrumb-separator">›</span>
          <span>{subCategory.name}</span>
        </nav>
        <h1 className="placeholder-title">{subCategory.name}</h1>
        <p className="placeholder-text">Products coming in Wave 2</p>
        <Link href="/" className="btn-primary">
          Back to Home
        </Link>
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

  // Perform price and GST calculations
  const basePriceNum = parseFloat(product.basePrice);
  const salePriceNum = product.salePrice ? parseFloat(product.salePrice) : null;
  const gstRateNum = parseFloat(product.gstRate || '12.00');

  const gstMultiplier = 1 + gstRateNum / 100;
  
  // Format prices as Indian Rupees (INR)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formattedBaseEx = formatCurrency(basePriceNum);
  const formattedBaseIncl = formatCurrency(basePriceNum * gstMultiplier);
  
  const formattedSaleEx = salePriceNum !== null ? formatCurrency(salePriceNum) : null;
  const formattedSaleIncl = salePriceNum !== null ? formatCurrency(salePriceNum * gstMultiplier) : null;

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

  // Construct structured product object for Schema
  const productWithRelations = {
    ...product,
    category: {
      name: category.name,
      slug: category.slug,
    },
    images: images.map((img: any) => ({
      url: img.url,
      is_primary: img.isPrimary,
      display_order: img.displayOrder,
    })),
  };

  return (
    <div className="pdp-container">
      {/* Google SEO JSON-LD Product Schema Markup */}
      <ProductSchema product={productWithRelations} />

      {breadcrumbs}

      <div className="pdp-grid">
        {/* Left Column: Interactive Image Gallery */}
        <div className="pdp-gallery-column">
          <ImageGallery images={productWithRelations.images} productName={product.name} />
        </div>

        {/* Right Column: Info & Actions */}
        <div className="pdp-info-column">
          <h1 className="product-title">{product.name}</h1>
          
          {/* Price Section */}
          <div className="product-price-section">
            {salePriceNum !== null ? (
              <div className="price-display-wrapper">
                <span className="price-sale-incl">{formattedSaleIncl}</span>
                <span className="price-base-strike">{formattedBaseIncl}</span>
                <div className="price-gst-subtext">
                  <span>Inclusive of {product.gstRate}% GST</span>
                  <span className="price-ex-gst">({formattedSaleEx} ex-GST)</span>
                </div>
              </div>
            ) : (
              <div className="price-display-wrapper">
                <span className="price-active-incl">{formattedBaseIncl}</span>
                <div className="price-gst-subtext">
                  <span>Inclusive of {product.gstRate}% GST</span>
                  <span className="price-ex-gst">({formattedBaseEx} ex-GST)</span>
                </div>
              </div>
            )}
          </div>

          <div className="product-description-divider"></div>

          {/* Descriptions */}
          {product.shortDescription && (
            <p className="product-short-description">{product.shortDescription}</p>
          )}

          {product.fullDescription && (
            <div className="product-full-description-wrapper">
              <h3 className="section-subtitle">Product Details</h3>
              <p className="product-full-description">{product.fullDescription}</p>
            </div>
          )}

          <div className="product-actions-divider"></div>

          {/* Add to Cart Actions */}
          <div className="add-to-cart-wrapper">
            <div className="tooltip-container">
              <button className="btn-add-to-cart" disabled>
                Add to Cart
              </button>
              <span className="tooltip-text">Select a variant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
