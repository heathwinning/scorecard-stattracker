export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta?: { duration: number; last_row_id: number; changes: number };
}

// D1Database interface for Cloudflare Workers (subset we use)
interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

interface D1PreparedStatement {
  bind(...params: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
  first<T = Record<string, unknown>>(col?: string): Promise<T | null>;
}

// Use Web Crypto API — available in browser and Cloudflare Workers
export function uuid(): string {
  return crypto.randomUUID();
}

// Database interface that works with both D1 (production) and local SQLite
let dbInstance: D1Database | null = null;

export function getDB(): D1Database {
  if (typeof process !== "undefined" && process.env.DB) {
    // @ts-expect-error - Cloudflare bindings
    return process.env.DB as D1Database;
  }

  throw new Error(
    "D1 database not available. Ensure you're running with wrangler or Cloudflare Pages."
  );
}

// Helper to run a query and get all results
export async function queryAll<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const stmt = db.prepare(sql);
  const bound = params.length > 0 ? stmt.bind(...params) : stmt;
  const result = await bound.all<T>();
  return result.results ?? [];
}

// Helper to run a query and get first result
export async function queryFirst<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const results = await queryAll<T>(db, sql, params);
  return results[0] ?? null;
}

// Helper to execute a mutation
export async function execute(
  db: D1Database,
  sql: string,
  params: unknown[] = []
): Promise<D1Result> {
  const stmt = db.prepare(sql);
  const bound = params.length > 0 ? stmt.bind(...params) : stmt;
  return bound.run();
}

// Build WHERE clause from filter object
export function buildWhere(
  filters: Record<string, unknown>,
  startIndex = 0
): { clause: string; params: unknown[] } {
  const entries = Object.entries(filters).filter(
    ([, v]) => v !== undefined && v !== null
  );
  if (entries.length === 0) return { clause: "", params: [] };

  const conditions = entries.map(
    ([key], i) => `${key} = ?${startIndex + i + 1}`
  );
  const params = entries.map(([, v]) => v);

  return {
    clause: `WHERE ${conditions.join(" AND ")}`,
    params,
  };
}
