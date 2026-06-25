import React from 'react';
import Link from 'next/link';

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    slug: string;
    base_price: string;
    sale_price: string | null;
    gst_rate: string;
    primary_image: string | null;
    category: {
      name: string;
      slug: string;
    } | null;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const basePriceNum = parseFloat(product.base_price);
  const salePriceNum = product.sale_price ? parseFloat(product.sale_price) : null;
  const gstRateNum = parseFloat(product.gst_rate || '12.00');

  const gstMultiplier = 1 + gstRateNum / 100;
  
  // Format price as Indian Rupees (INR)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formattedBaseIncl = formatCurrency(basePriceNum * gstMultiplier);
  const formattedSaleIncl = salePriceNum !== null ? formatCurrency(salePriceNum * gstMultiplier) : null;

  // Resolve link category path
  const categorySlug = product.category?.slug || 'products';
  const productUrl = `/${categorySlug}/${product.slug}`;

  return (
    <Link href={productUrl} className="product-card-link">
      <article className="product-card">
        {/* Product Image Cover */}
        <div className="product-card-image-wrapper">
          {product.primary_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.primary_image}
              alt={product.name}
              className="product-card-image"
              loading="lazy"
            />
          ) : (
            <div className="product-card-image-placeholder">No Image</div>
          )}
          {/* Category Badge */}
          {product.category && (
            <span className="product-card-badge">{product.category.name}</span>
          )}
        </div>

        {/* Product details */}
        <div className="product-card-details">
          <h3 className="product-card-title">{product.name}</h3>
          
          <div className="product-card-price-row">
            {salePriceNum !== null ? (
              <div className="product-card-prices">
                <span className="product-card-price-sale">{formattedSaleIncl}</span>
                <span className="product-card-price-base-strike">{formattedBaseIncl}</span>
              </div>
            ) : (
              <div className="product-card-prices">
                <span className="product-card-price-active">{formattedBaseIncl}</span>
              </div>
            )}
            <span className="product-card-gst-note">Incl. GST</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
