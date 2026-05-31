import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { loadServerEnv } from '../server-env.ts';
import * as schema from './schema.ts';

loadServerEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('DATABASE_URL is not set. Database calls will fail until it is configured.');
}

const sql = neon(databaseUrl ?? 'postgresql://placeholder:placeholder@localhost/placeholder');

export const db = drizzle(sql, { schema });
