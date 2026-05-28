CREATE TABLE "post_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"blob_url" text NOT NULL,
	"blob_key" text NOT NULL,
	"mime_type" text DEFAULT 'image/png' NOT NULL,
	"width" integer,
	"height" integer,
	"is_edited" boolean DEFAULT false NOT NULL,
	"original_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"caption" text,
	"hashtags" text[] DEFAULT '{}'::text[],
	"platform_size" text DEFAULT '1080x1080' NOT NULL,
	"notes" text,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"exported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_post_media_post" ON "post_media" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_posts_business" ON "posts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_posts_status" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_posts_business_status" ON "posts" USING btree ("business_id","status");