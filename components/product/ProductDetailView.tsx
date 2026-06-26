'use client';

import React, { useState } from 'react';
import ImageGallery from './ImageGallery';
import VariantSelector from './VariantSelector';
import ProductSchema from './ProductSchema';

interface Product {
  id: number;
  name: string;
  slug: string;
  category: { name: string; slug: string } | null;
  short_description: string | null;
  full_description: string | null;
  base_price: string;
  sale_price: string | null;
  gst_rate: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

interface Variant {
  id: number;
  sku: string;
  size: string | null;
  color: string | null;
  material: string | null;
  price_override: string | null;
  effective_price: string;
  stock: number;
  in_stock: boolean;
  images: {
    url: string;
    is_primary: boolean;
    display_order: number;
  }[];
}

interface ImageType {
  url: string;
  is_primary: boolean;
  display_order: number;
  variant_id?: number | null;
}

interface ProductDetailViewProps {
  product: Product;
  initialImages: ImageType[];
  variants: Variant[];
}

export default function ProductDetailView({
  product,
  initialImages,
  variants,
}: ProductDetailViewProps) {
  // State for selected size and color
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Find matching variant based on selections
  const matchedVariant = variants.find((v) => {
    const sizeMatch = v.size === selectedSize || (!v.size && !selectedSize);
    const colorMatch = v.color === selectedColor || (!v.color && !selectedColor);
    return sizeMatch && colorMatch;
  });

  // Determine active images
  const generalImages = initialImages.filter((img) => !img.variant_id);
  const defaultImages = generalImages.length > 0 ? generalImages : initialImages;
  const displayImages =
    matchedVariant && matchedVariant.images && matchedVariant.images.length > 0
      ? matchedVariant.images
      : defaultImages;

  // Calculate prices based on selection and GST
  const gstRateNum = parseFloat(product.gst_rate || '12.00');
  const gstMultiplier = 1 + gstRateNum / 100;

  let activePriceExGst: number;
  let originalPriceExGst: number | null = null;

  if (matchedVariant) {
    activePriceExGst = parseFloat(matchedVariant.effective_price);
    if (matchedVariant.price_override !== null) {
      const base = parseFloat(product.base_price);
      if (activePriceExGst < base) {
        originalPriceExGst = base;
      }
    } else if (product.sale_price !== null) {
      originalPriceExGst = parseFloat(product.base_price);
    }
  } else {
    if (product.sale_price !== null) {
      activePriceExGst = parseFloat(product.sale_price);
      originalPriceExGst = parseFloat(product.base_price);
    } else {
      activePriceExGst = parseFloat(product.base_price);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formattedActiveIncl = formatCurrency(activePriceExGst * gstMultiplier);
  const formattedActiveEx = formatCurrency(activePriceExGst);

  const formattedOriginalIncl =
    originalPriceExGst !== null ? formatCurrency(originalPriceExGst * gstMultiplier) : null;

  // Add to Cart Button Logic
  // A variant is required to be fully selected if size or color variants exist
  const hasSizes = variants.some((v) => v.size);
  const hasColors = variants.some((v) => v.color);
  
  const isSelectionIncomplete = (hasSizes && !selectedSize) || (hasColors && !selectedColor);

  let addToCartText = 'Add to Cart';
  let isAddToCartDisabled = true;
  let showNotifyMe = false;

  if (isSelectionIncomplete) {
    addToCartText = 'Select Size & Color';
    isAddToCartDisabled = true;
  } else if (!matchedVariant) {
    addToCartText = 'Unavailable';
    isAddToCartDisabled = true;
  } else if (!matchedVariant.in_stock) {
    addToCartText = 'Out of Stock';
    isAddToCartDisabled = true;
    showNotifyMe = true;
  } else {
    addToCartText = 'Add to Cart';
    isAddToCartDisabled = false;
  }

  // Construct structured product object for Schema
  const productWithRelations = {
    ...product,
    basePrice: product.base_price,
    salePrice: product.sale_price,
    gstRate: product.gst_rate,
    category: product.category,
    images: displayImages,
  };

  return (
    <div className="pdp-grid">
      {/* Google SEO JSON-LD Product Schema Markup */}
      <ProductSchema product={productWithRelations} />

      {/* Left Column: Interactive Image Gallery */}
      <div className="pdp-gallery-column">
        <ImageGallery
          key={displayImages.map((img) => img.url).join(',')}
          images={displayImages}
          productName={product.name}
        />
      </div>

      {/* Right Column: Info & Actions */}
      <div className="pdp-info-column">
        <h1 className="product-title">{product.name}</h1>

        {/* Price Section */}
        <div className="product-price-section">
          <div className="price-display-wrapper">
            <div className="price-line">
              <span className={originalPriceExGst !== null ? 'price-sale-incl' : 'price-active-incl'}>
                {formattedActiveIncl}
              </span>
              {formattedOriginalIncl !== null && (
                <span className="price-base-strike">{formattedOriginalIncl}</span>
              )}
            </div>
            <div className="price-gst-subtext">
              <span>Inclusive of {gstRateNum}% GST</span>
              <span className="price-ex-gst">({formattedActiveEx} ex-GST)</span>
            </div>
          </div>
        </div>

        {/* Stock Status Badge */}
        {matchedVariant && (
          <div className="stock-status-container">
            {matchedVariant.in_stock ? (
              <span className={`stock-badge in-stock ${matchedVariant.stock <= 5 ? 'low-stock' : ''}`}>
                {matchedVariant.stock <= 5
                  ? `Only ${matchedVariant.stock} left in stock - order soon`
                  : 'In Stock'}
              </span>
            ) : (
              <span className="stock-badge out-of-stock">Out of Stock</span>
            )}
          </div>
        )}

        <div className="product-description-divider"></div>

        {/* Variant Selectors */}
        <VariantSelector
          variants={variants}
          selectedSize={selectedSize}
          selectedColor={selectedColor}
          onSelectSize={setSelectedSize}
          onSelectColor={setSelectedColor}
        />

        {isSelectionIncomplete && (
          <p className="selection-prompt-text">Please select a size and color to check availability.</p>
        )}

        {/* Actions Section */}
        <div className="pdp-actions-section">
          <div className="add-to-cart-wrapper">
            <button
              className="btn-add-to-cart"
              disabled={isAddToCartDisabled}
              type="button"
            >
              {addToCartText}
            </button>
          </div>

          {/* Notify Me Form (VS-40 Wire 8 placeholder) */}
          {showNotifyMe && (
            <div className="notify-me-container animate-fade-in">
              <p className="notify-me-text">
                This variant is currently out of stock. Want to get notified when it's back?
              </p>
              <div className="notify-me-form-row">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="notify-email-input"
                  aria-label="Email for stock notification"
                  required
                />
                <button
                  type="button"
                  className="btn-notify-me"
                  onClick={() => alert('Stock notification request received!')}
                >
                  Notify Me
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="product-actions-divider"></div>

        {/* Descriptions */}
        {product.short_description && (
          <p className="product-short-description">{product.short_description}</p>
        )}

        {product.full_description && (
          <div className="product-full-description-wrapper">
            <h3 className="section-subtitle">Product Details</h3>
            <p className="product-full-description">{product.full_description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
