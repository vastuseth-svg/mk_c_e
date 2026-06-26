ALTER TABLE "users" ADD COLUMN "refresh_token_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "refresh_token_exp" timestamp with time zone;