CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"variant_id" integer,
	"url" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_primary" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"short_description" text,
	"full_description" text,
	"base_price" numeric(10, 2) NOT NULL,
	"sale_price" numeric(10, 2),
	"gst_rate" numeric(4, 2) DEFAULT '12.00',
	"status" varchar(20) DEFAULT 'draft',
	"meta_title" varchar(160),
	"meta_description" varchar(320),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;