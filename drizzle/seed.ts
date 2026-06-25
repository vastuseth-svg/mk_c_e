import { db as defaultDb } from '../lib/db';
import { categories, products, productImages, tags, productTags } from './schema';
import { eq } from 'drizzle-orm';
import { drizzle as nodePostgresDrizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import dns from 'dns';
import { promisify } from 'util';

const lookupPromise = promisify(dns.lookup);

async function createPgClient(connectionString: string) {
  const parsed = new URL(connectionString);
  const hostname = parsed.hostname;
  const lookup = await lookupPromise(hostname, { family: 4 });
  const ipAddress = lookup.address;
  
  return new Client({
    host: ipAddress,
    port: parsed.port ? parseInt(parsed.port) : 5432,
    user: parsed.username,
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.substring(1),
    ssl: {
      rejectUnauthorized: false,
      servername: hostname
    }
  });
}


async function seed(db: any) {
  console.log('Clearing database...');
  await db.delete(productTags);
  await db.delete(tags);
  await db.delete(productImages);
  await db.delete(products);
  await db.delete(categories);

  console.log('Seeding categories...');

  // 1. Root categories
  const roots = [
    { name: "Men's Wear", slug: "mens-wear", displayOrder: 1 },
    { name: "Women's Wear", slug: "womens-wear", displayOrder: 2 },
    { name: "Kids' Wear", slug: "kids-wear", displayOrder: 3 },
    { name: "Fabrics & Accessories", slug: "fabrics-accessories", displayOrder: 4 },
  ];

  const rootIds: Record<string, number> = {};

  for (const root of roots) {
    const [inserted] = await db.insert(categories).values({
      name: root.name,
      slug: root.slug,
      displayOrder: root.displayOrder,
      active: true,
    }).returning({ id: categories.id });
    rootIds[root.slug] = inserted.id;
  }

  // 2. Sub-categories
  const subs = [
    // Men's Wear subs
    { parentSlug: 'mens-wear', name: 'Formal Shirts', slug: 'formal-shirts', displayOrder: 1 },
    { parentSlug: 'mens-wear', name: 'Trousers', slug: 'trousers', displayOrder: 2 },
    { parentSlug: 'mens-wear', name: 'Ethnic Wear', slug: 'ethnic-wear', displayOrder: 3 },

    // Women's Wear subs
    { parentSlug: 'womens-wear', name: 'Sarees', slug: 'sarees', displayOrder: 1 },
    { parentSlug: 'womens-wear', name: 'Kurtis', slug: 'kurtis', displayOrder: 2 },
    { parentSlug: 'womens-wear', name: 'Salwar Suits', slug: 'salwar-suits', displayOrder: 3 },
  ];

  for (const sub of subs) {
    await db.insert(categories).values({
      parentId: rootIds[sub.parentSlug],
      name: sub.name,
      slug: sub.slug,
      displayOrder: sub.displayOrder,
      active: true,
    });
  }

  // 3. Seed tags
  console.log('Seeding tags...');
  const tagsData = [
    { name: 'Formal', slug: 'formal' },
    { name: 'Office', slug: 'office' },
    { name: 'Cotton', slug: 'cotton' },
    { name: 'Silk', slug: 'silk' },
    { name: 'Saree', slug: 'saree' },
    { name: 'Kurti', slug: 'kurti' },
    { name: 'Indigo', slug: 'indigo' },
    { name: 'Traditional', slug: 'traditional' },
  ];

  const tagIds: Record<string, number> = {};
  for (const t of tagsData) {
    const [inserted] = await db.insert(tags).values(t).returning({ id: tags.id });
    tagIds[t.slug] = inserted.id;
  }

  // 4. Seed Products and Product Images
  console.log('Seeding products...');

  const [formalShirts] = await db.select().from(categories).where(eq(categories.slug, 'formal-shirts')).limit(1);
  const [trousers] = await db.select().from(categories).where(eq(categories.slug, 'trousers')).limit(1);
  const [sarees] = await db.select().from(categories).where(eq(categories.slug, 'sarees')).limit(1);
  const [kurtis] = await db.select().from(categories).where(eq(categories.slug, 'kurtis')).limit(1);
  const [salwarSuits] = await db.select().from(categories).where(eq(categories.slug, 'salwar-suits')).limit(1);

  if (formalShirts && trousers && sarees && kurtis && salwarSuits) {
    // 1. Classic Blue Formal Shirt
    const [shirtProd] = await db.insert(products).values({
      categoryId: formalShirts.id,
      name: "Classic Blue Formal Shirt",
      slug: "classic-blue-formal-shirt",
      shortDescription: "A premium cotton formal shirt designed for sharp office wear.",
      fullDescription: "Crafted from 100% long-staple cotton, this classic blue formal shirt features a crisp semi-spread collar, single-button rounded cuffs, and a tail hem. Breathable and wrinkle-resistant for all-day comfort.",
      basePrice: "1499.00",
      salePrice: "1199.00",
      gstRate: "12.00",
      status: "active",
      metaTitle: "Classic Blue Formal Shirt | Premium Office Wear",
      metaDescription: "Buy our premium 100% cotton Classic Blue Formal Shirt. Breathable, wrinkle-resistant, and perfect for office wear."
    }).returning({ id: products.id });

    await db.insert(productImages).values([
      { productId: shirtProd.id, url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop", displayOrder: 1, isPrimary: true },
      { productId: shirtProd.id, url: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=800&auto=format&fit=crop", displayOrder: 2, isPrimary: false }
    ]);

    await db.insert(productTags).values([
      { productId: shirtProd.id, tagId: tagIds['formal'] },
      { productId: shirtProd.id, tagId: tagIds['office'] },
      { productId: shirtProd.id, tagId: tagIds['cotton'] },
    ]);

    // 2. Men's Slim Fit Cotton Trousers
    const [trousersProd] = await db.insert(products).values({
      categoryId: trousers.id,
      name: "Men's Slim Fit Cotton Trousers",
      slug: "mens-cotton-trousers-black",
      shortDescription: "Premium stretch cotton trousers for ultimate office comfort and clean style.",
      fullDescription: "Designed with a contemporary slim silhouette, these cotton trousers feature a flat-front design, four pockets, and a button-zip closure. Woven with a touch of elastane for flexibility.",
      basePrice: "1899.00",
      salePrice: "1599.00",
      gstRate: "12.00",
      status: "active",
      metaTitle: "Men's Slim Fit Cotton Trousers | Premium Office Chinos",
      metaDescription: "Shop men's slim fit stretch cotton trousers. Breathable, soft, and perfect for a polished office look."
    }).returning({ id: products.id });

    await db.insert(productImages).values([
      { productId: trousersProd.id, url: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?q=80&w=800&auto=format&fit=crop", displayOrder: 1, isPrimary: true },
      { productId: trousersProd.id, url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop", displayOrder: 2, isPrimary: false }
    ]);

    await db.insert(productTags).values([
      { productId: trousersProd.id, tagId: tagIds['formal'] },
      { productId: trousersProd.id, tagId: tagIds['office'] },
      { productId: trousersProd.id, tagId: tagIds['cotton'] },
    ]);

    // 3. Banarasi Silk Saree
    const [sareeProd] = await db.insert(products).values({
      categoryId: sarees.id,
      name: "Banarasi Silk Saree",
      slug: "banarasi-silk-saree-red",
      shortDescription: "An elegant crimson Banarasi silk saree with ornate golden zari work.",
      fullDescription: "Woven in Varanasi, this crimson red Banarasi silk saree is embellished with intricate floral zari designs. Featuring a matching unstitched blouse piece, it exudes royal grace and traditional craftsmanship.",
      basePrice: "2499.00",
      salePrice: "1999.00",
      gstRate: "12.00",
      status: "active",
      metaTitle: "Crimson Banarasi Silk Saree | Ornate Golden Zari",
      metaDescription: "Shop our stunning crimson Banarasi silk saree with authentic gold zari. Exquisite traditional handloom craftsmanship."
    }).returning({ id: products.id });

    await db.insert(productImages).values([
      { productId: sareeProd.id, url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop", displayOrder: 1, isPrimary: true },
      { productId: sareeProd.id, url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=800&auto=format&fit=crop", displayOrder: 2, isPrimary: false }
    ]);

    await db.insert(productTags).values([
      { productId: sareeProd.id, tagId: tagIds['silk'] },
      { productId: sareeProd.id, tagId: tagIds['saree'] },
      { productId: sareeProd.id, tagId: tagIds['traditional'] },
    ]);

    // 4. Designer Cotton Kurti
    const [kurtiProd] = await db.insert(products).values({
      categoryId: kurtis.id,
      name: "Designer Cotton Kurti",
      slug: "designer-cotton-kurti-blue",
      shortDescription: "A breathable, stylish designer cotton kurti for casual and festive occasions.",
      fullDescription: "Make a statement with this rich indigo blue designer kurti. Made of premium cotton fabric, it features intricate hand block prints, an elegant collar, and a modern side-slit pattern.",
      basePrice: "799.00",
      salePrice: null,
      gstRate: "12.00",
      status: "active",
      metaTitle: "Designer Cotton Kurti | Indigo Blue Block Print",
      metaDescription: "Get the latest Indigo Blue Designer Cotton Kurti. Features hand block prints, premium breathable cotton."
    }).returning({ id: products.id });

    await db.insert(productImages).values([
      { productId: kurtiProd.id, url: "https://images.unsplash.com/photo-1608748010899-18f300247112?q=80&w=800&auto=format&fit=crop", displayOrder: 1, isPrimary: true },
      { productId: kurtiProd.id, url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop", displayOrder: 2, isPrimary: false }
    ]);

    await db.insert(productTags).values([
      { productId: kurtiProd.id, tagId: tagIds['cotton'] },
      { productId: kurtiProd.id, tagId: tagIds['kurti'] },
      { productId: kurtiProd.id, tagId: tagIds['indigo'] },
      { productId: kurtiProd.id, tagId: tagIds['traditional'] },
    ]);

    // 5. Floral Print Cotton Salwar Suit
    const [suitProd] = await db.insert(products).values({
      categoryId: salwarSuits.id,
      name: "Floral Print Cotton Salwar Suit",
      slug: "floral-print-cotton-salwar-suit",
      shortDescription: "A beautiful floral print cotton salwar suit set with matching dupatta.",
      fullDescription: "This summer-ready salwar suit set is made from pure, soft cotton fabric. Features vibrant floral prints, a comfortable straight-cut kurta, matching pants, and a lightweight printed chiffon dupatta.",
      basePrice: "1699.00",
      salePrice: null,
      gstRate: "12.00",
      status: "active",
      metaTitle: "Floral Print Cotton Salwar Suit | Summer Collection",
      metaDescription: "Shop our light, breathable floral print cotton salwar suit set. Perfect comfort for hot summers and casual outings."
    }).returning({ id: products.id });

    await db.insert(productImages).values([
      { productId: suitProd.id, url: "https://images.unsplash.com/photo-1610030469668-93535c17b6b3?q=80&w=800&auto=format&fit=crop", displayOrder: 1, isPrimary: true },
      { productId: suitProd.id, url: "https://images.unsplash.com/photo-1583391265517-35bbdad01209?q=80&w=800&auto=format&fit=crop", displayOrder: 2, isPrimary: false }
    ]);

    await db.insert(productTags).values([
      { productId: suitProd.id, tagId: tagIds['traditional'] },
      { productId: suitProd.id, tagId: tagIds['cotton'] },
    ]);
  }

  console.log('Seeding complete!');
}

async function main() {
  if (process.env.POSTGRES_URL) {
    console.log('Seeding Vercel Postgres using TCP connection...');
    const client = await createPgClient(process.env.POSTGRES_URL);
    await client.connect();
    const dbInstance = nodePostgresDrizzle(client);
    await seed(dbInstance);
    await client.end();
  } else {
    console.log('Seeding local PGlite...');
    await seed(defaultDb);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});


