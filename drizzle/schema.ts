import { pgTable, serial, integer, varchar, text, boolean, timestamp, AnyPgColumn, numeric, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const categories = pgTable('categories', {
  id:           serial('id').primaryKey(),
  parentId:     integer('parent_id').references((): AnyPgColumn => categories.id),
  name:         varchar('name', { length: 120 }).notNull(),
  slug:         varchar('slug', { length: 120 }).notNull().unique(),
  bannerImage:  text('banner_image'),
  metaTitle:    varchar('meta_title', { length: 160 }),
  metaDesc:     varchar('meta_desc', { length: 320 }),
  displayOrder: integer('display_order').default(0),
  active:       boolean('active').default(true),
  createdAt:    timestamp('created_at').defaultNow()
});

export const products = pgTable('products', {
  id:               serial('id').primaryKey(),
  categoryId:       integer('category_id').references(() => categories.id),
  name:             varchar('name', { length: 255 }).notNull(),
  slug:             varchar('slug', { length: 255 }).notNull().unique(),
  shortDescription: text('short_description'),
  fullDescription:  text('full_description'),
  basePrice:        numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  salePrice:        numeric('sale_price', { precision: 10, scale: 2 }),
  gstRate:          numeric('gst_rate', { precision: 4, scale: 2 }).default('12.00'),
  status:           varchar('status', { length: 20 }).default('draft'),
  metaTitle:        varchar('meta_title', { length: 160 }),
  metaDescription:  varchar('meta_description', { length: 320 }),
  createdAt:        timestamp('created_at').defaultNow()
});

export const productImages = pgTable('product_images', {
  id:           serial('id').primaryKey(),
  productId:    integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantId:    integer('variant_id'),  // FK added in VS-04 migration
  url:          text('url').notNull(),  // Image URL
  displayOrder: integer('display_order').default(0),
  isPrimary:    boolean('is_primary').default(false)
});

export const tags = pgTable('tags', {
  id:   serial('id').primaryKey(),
  name: varchar('name', { length: 80 }).notNull(),
  slug: varchar('slug', { length: 80 }).notNull().unique()
});

export const productTags = pgTable('product_tags', {
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  tagId:     integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' })
}, (t) => ({
  pk: primaryKey({ columns: [t.productId, t.tagId] })
}));

export const users = pgTable('users', {
  id:             serial('id').primaryKey(),
  name:           varchar('name', { length: 120 }).notNull(),
  email:          varchar('email', { length: 255 }),
  phone:          varchar('phone', { length: 15 }),
  passwordHash:   text('password_hash'),
  role:           varchar('role', { length: 30 }).default('customer'),
  emailVerified:  boolean('email_verified').default(false),
  phoneVerified:  boolean('phone_verified').default(false),
  createdAt:      timestamp('created_at').defaultNow()
}, (table) => ({
  emailUnique: uniqueIndex('users_email_unique').on(table.email).where(sql`${table.email} is not null`),
  phoneUnique: uniqueIndex('users_phone_unique').on(table.phone).where(sql`${table.phone} is not null`),
}));


