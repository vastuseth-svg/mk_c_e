CREATE TABLE "product_tags" (
	"product_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "product_tags_product_id_tag_id_pk" PRIMARY KEY("product_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"slug" varchar(80) NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "products_search_idx" ON "products" USING gin(to_tsvector('english', "name" || ' ' || COALESCE("short_description", '')));
--> statement-breakpoint
CREATE INDEX "tags_search_idx" ON "tags" USING btree("name");