CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"banner_image" text,
	"meta_title" varchar(160),
	"meta_desc" varchar(320),
	"display_order" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;