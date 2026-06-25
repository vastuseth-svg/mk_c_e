CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(255),
	"phone" varchar(15),
	"password_hash" text,
	"role" varchar(30) DEFAULT 'customer',
	"email_verified" boolean DEFAULT false,
	"phone_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email") WHERE "users"."email" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "users" USING btree ("phone") WHERE "users"."phone" is not null;