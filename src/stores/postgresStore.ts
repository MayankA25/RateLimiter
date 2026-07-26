import type { Store } from "../types/store.js";
import { Pool } from "pg";

interface PostgresOptions {
  connectionString?: string;
  pool?: Pool;
  table?: string;
}

interface PostgresEntry<T> {
  value: T;
  expiresAt?: number;
}

interface Lock {
  promise: Promise<void>;
  release: () => void;
}

export class PostgresStore implements Store {
  private readonly locks = new Map<string, Lock>();

  constructor(
    private readonly pool: Pool,
    private readonly table: string,
  ) {}

  static async create(options: PostgresOptions) {
    const pool =
      options.pool ??
      new Pool({
        connectionString: options.connectionString,
      });

    const table = options.table ?? "rate_limiter";

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
      throw new Error("Invalid table name.");
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${table} (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL,
            expires_at TIMESTAMPTZ
        )
    `);

    return new PostgresStore(pool, table);
  }

  async get<T>(key: string): Promise<T | null> {
    const result = await this.pool.query(
      `SELECT value, expires_at FROM ${this.table} WHERE key = $1`,
      [key],
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];

    let expiresAt = null;

    if (row.expires_at != null) {
      expiresAt =
        row.expires_at instanceof Date
          ? row.expires_at.getTime()
          : row.expires_at
            ? new Date(row.expires_at).getTime()
            : null;
    }

    if (expiresAt != null && expiresAt <= Date.now()) {
      await this.delete(key);
      return null;
    }

    return row.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expires_at = ttl != undefined ? new Date(Date.now() + ttl) : undefined;

    await this.pool.query(
      `INSERT INTO ${this.table} (key, value, expires_at) VALUES ($1, $2, $3) ON CONFLICT(KEY) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
      [key, JSON.stringify(value), expires_at],
    );
  }

  async delete(key: string): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.table} WHERE key=$1`, [key]);
  }

  private async acquireLock(key: string) {
    const existing = this.locks.get(key);

    if (existing) {
      await existing.promise;
    }

    let release!: () => void;

    const promise = new Promise<void>((res: () => void) => {
      release = res;
    });

    this.locks.set(key, {
      promise: promise,
      release: release,
    });
  }

  private async releaseLock(key: string) {
    const lock = this.locks.get(key);

    if (!lock) return;

    lock.release();
    this.locks.delete(key);
  }

  async update<T, R>(key: string, updater: (current: T | null) => { value: T; ttl?: number; result: R; }): Promise<R> {
      await this.acquireLock(key);

      try{
        const current = await this.get<T>(key);

        const update = updater(current);

        await this.set<T>(key, update.value, update.ttl);

        return update.result
      }
      finally{
        await this.releaseLock(key);
      }
  }

}
