ALTER TABLE "posts" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_posts_business_scheduled" ON "posts" USING btree ("business_id","scheduled_at");