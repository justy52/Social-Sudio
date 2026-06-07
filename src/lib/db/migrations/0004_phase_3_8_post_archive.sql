ALTER TABLE "posts" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_posts_business_archived" ON "posts" USING btree ("business_id","archived_at");