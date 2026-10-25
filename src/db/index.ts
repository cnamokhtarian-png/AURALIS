import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // Do not crash at import/build time (e.g. `next build` without secrets).
  // Queries will fail with a clear connection error until DATABASE_URL is set.
  console.warn("[db] DATABASE_URL is not set — database queries will fail.");
}

const isLocalUrl =
  !databaseUrl || /@(localhost|127\.0\.0\.1|\[::1\])/.test(databaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __auralisPool?: Pool;
};

export const pool =
  globalForDb.__auralisPool ??
  new Pool({
    connectionString: databaseUrl,
    // Supabase (pooler) requires SSL; local Postgres does not use it.
    ssl: isLocalUrl ? undefined : { rejectUnauthorized: false },
    // Keep the pool small on serverless (Vercel) + Supabase transaction pooler.
    max: isLocalUrl ? 10 : 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__auralisPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
