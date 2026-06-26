'use client';

import React from 'react';

interface Variant {
  id: number;
  sku: string;
  size: string | null;
  color: string | null;
  material: string | null;
  effective_price: string;
  stock: number;
  in_stock: boolean;
}

interface VariantSelectorProps {
  variants: Variant[];
  selectedSize: string | null;
  selectedColor: string | null;
  onSelectSize: (size: string | null) => void;
  onSelectColor: (color: string | null) => void;
}

const COLOR_MAP: Record<string, string> = {
  red: '#E11D48',
  blue: '#2563EB',
  green: '#16A34A',
  pink: '#EC4899',
  black: '#171717',
  white: '#F8FAFC',
};

export default function VariantSelector({
  variants,
  selectedSize,
  selectedColor,
  onSelectSize,
  onSelectColor,
}: VariantSelectorProps) {
  // Extract unique sizes and colors
  const sizes = Array.from(
    new Set(variants.map((v) => v.size).filter((s): s is string => typeof s === 'string' && s !== ''))
  );
  
  const colors = Array.from(
    new Set(variants.map((v) => v.color).filter((c): c is string => typeof c === 'string' && c !== ''))
  );

  if (sizes.length === 0 && colors.length === 0) {
    return null;
  }

  // Helper to get swatch color value
  const getSwatchColorValue = (colorName: string) => {
    const key = colorName.toLowerCase().trim();
    return COLOR_MAP[key] || colorName;
  };

  return (
    <div className="variant-selectors-container">
      {/* Color Selector */}
      {colors.length > 0 && (
        <div className="selector-group">
          <span className="section-subtitle">
            Color: <span className="selected-value-label">{selectedColor || 'Select Color'}</span>
          </span>
          <div className="color-swatches-grid">
            {colors.map((color) => {
              const isActive = selectedColor === color;
              const swatchColor = getSwatchColorValue(color);
              
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onSelectColor(color)}
                  className={`color-swatch-btn ${isActive ? 'active' : ''}`}
                  style={{ '--swatch-color': swatchColor } as React.CSSProperties}
                  aria-label={`Select color ${color}`}
                  aria-pressed={isActive}
                >
                  <span className="color-swatch-inner" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Size Selector */}
      {sizes.length > 0 && (
        <div className="selector-group">
          <span className="section-subtitle">
            Size: <span className="selected-value-label">{selectedSize || 'Select Size'}</span>
          </span>
          <div className="size-buttons-grid">
            {sizes.map((size) => {
              const isActive = selectedSize === size;
              
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => onSelectSize(size)}
                  className={`size-button-btn ${isActive ? 'active' : ''}`}
                  aria-label={`Select size ${size}`}
                  aria-pressed={isActive}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
