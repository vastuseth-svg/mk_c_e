import React from 'react';

interface ProductSchemaProps {
  product: {
    id: number;
    name: string;
    slug: string;
    short_description: string | null;
    full_description: string | null;
    base_price: string;
    sale_price: string | null;
    category: {
      name: string;
      slug: string;
    } | null;
    images: { url: string }[];
  };
}

export default function ProductSchema({ product }: ProductSchemaProps) {
  const finalPrice = product.sale_price || product.base_price;
  const imageUrls = product.images.map(img => img.url);

  const schemaJson = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: imageUrls,
    description: product.short_description || product.full_description || '',
    sku: `CLOTH-${product.id}`,
    offers: {
      '@type': 'Offer',
      price: finalPrice,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: `https://clothweb.example.com/${product.category?.slug || 'products'}/${product.slug}`,
      valueAddedTaxIncluded: true,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJson) }}
    />
  );
}
