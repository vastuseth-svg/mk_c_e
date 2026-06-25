'use client';

import React, { useState } from 'react';

interface ImageGalleryProps {
  images: {
    url: string;
    is_primary: boolean;
    display_order: number;
  }[];
  productName: string;
}

export default function ImageGallery({ images, productName }: ImageGalleryProps) {
  // Sort images by display order to guarantee consistent presentation
  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);
  
  // Find primary image index or default to 0
  const initialIndex = sortedImages.findIndex(img => img.is_primary);
  const [activeIndex, setActiveIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  if (sortedImages.length === 0) {
    return (
      <div className="empty-gallery">
        <div className="empty-gallery-placeholder">No Image Available</div>
      </div>
    );
  }

  const activeImage = sortedImages[activeIndex];

  return (
    <div className="product-gallery">
      {/* Main Large Image */}
      <div className="main-image-container">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeImage.url}
          alt={`${productName} - View ${activeIndex + 1}`}
          className="main-image"
          key={activeImage.url} // Forces re-render animation when swapped
        />
      </div>

      {/* Thumbnails list */}
      {sortedImages.length > 1 && (
        <div className="thumbnails-grid">
          {sortedImages.map((img, idx) => (
            <button
              key={img.url}
              onClick={() => setActiveIndex(idx)}
              className={`thumbnail-btn ${idx === activeIndex ? 'active' : ''}`}
              aria-label={`View image ${idx + 1} of ${productName}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={`${productName} thumbnail ${idx + 1}`}
                className="thumbnail-img"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
