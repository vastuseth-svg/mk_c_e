import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLOTHWEB - Premium Indian Garments & Fabrics",
  description: "Curated premium Indian garments and fabrics. Made with love, designed for elegance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
