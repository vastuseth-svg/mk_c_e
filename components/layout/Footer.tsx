import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <div className="footer-brand">
          <h3>CLOTHWEB</h3>
          <p>
            Curated premium Indian garments and fabrics. Made with love, designed for elegance.
          </p>
        </div>
        <div className="footer-links">
          <h4>Shop</h4>
          <ul>
            <li><Link href="/mens-wear">Men's Wear</Link></li>
            <li><Link href="/womens-wear">Women's Wear</Link></li>
            <li><Link href="/kids-wear">Kids' Wear</Link></li>
            <li><Link href="/fabrics-accessories">Fabrics & Accessories</Link></li>
          </ul>
        </div>
        <div className="footer-links">
          <h4>Customer Care</h4>
          <ul>
            <li><Link href="/about">About Us</Link></li>
            <li><Link href="/contact">Contact Us</Link></li>
            <li><Link href="/shipping">Shipping & Returns</Link></li>
            <li><Link href="/terms">Terms & Conditions</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} CLOTHWEB. All rights reserved.</p>
        <p>Built with Next.js & Drizzle</p>
      </div>
    </footer>
  );
}
