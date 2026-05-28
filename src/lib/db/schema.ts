import { relations, sql } from 'drizzle-orm';
import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logoUrl: text('logo_url'),
    primaryColor: text('primary_color').default('#0F766E').notNull(),
    accentColor: text('accent_color').default('#6D5BD0').notNull(),
    industry: text('industry'),
    websiteUrl: text('website_url'),
    defaultHashtags: text('default_hashtags')
      .array()
      .default(sql`'{}'::text[]`),
    brandVoice: text('brand_voice'),
    timezone: text('timezone').default('America/Denver').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_businesses_user').on(table.userId),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  businesses: many(businesses),
}));

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    status: text('status').default('draft').notNull(),
    caption: text('caption'),
    hashtags: text('hashtags')
      .array()
      .default(sql`'{}'::text[]`),
    platformSize: text('platform_size').default('1080x1080').notNull(),
    notes: text('notes'),
    aiGenerated: boolean('ai_generated').default(false).notNull(),
    exportedAt: timestamp('exported_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    businessIdx: index('idx_posts_business').on(table.businessId),
    statusIdx: index('idx_posts_status').on(table.status),
    businessStatusIdx: index('idx_posts_business_status').on(table.businessId, table.status),
  }),
);

export const postMedia = pgTable(
  'post_media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    blobUrl: text('blob_url').notNull(),
    blobKey: text('blob_key').notNull(),
    mimeType: text('mime_type').default('image/png').notNull(),
    width: integer('width'),
    height: integer('height'),
    isEdited: boolean('is_edited').default(false).notNull(),
    originalUrl: text('original_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    postIdx: index('idx_post_media_post').on(table.postId),
  }),
);

export const businessesRelations = relations(businesses, ({ many, one }) => ({
  owner: one(users, {
    fields: [businesses.userId],
    references: [users.id],
  }),
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ many, one }) => ({
  business: one(businesses, {
    fields: [posts.businessId],
    references: [businesses.id],
  }),
  media: many(postMedia),
}));

export const postMediaRelations = relations(postMedia, ({ one }) => ({
  post: one(posts, {
    fields: [postMedia.postId],
    references: [posts.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostMedia = typeof postMedia.$inferSelect;
export type NewPostMedia = typeof postMedia.$inferInsert;
