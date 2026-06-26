ALTER TABLE "users" ADD COLUMN "otp_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "otp_exp" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "otp_attempts" integer DEFAULT 0;