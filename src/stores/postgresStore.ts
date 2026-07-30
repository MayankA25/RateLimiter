import { createHash } from "node:crypto";
import type { Store } from "../types/store.js";
import { Pool, type PoolClient } from "pg";

interface PostgresOptions {
  connectionString?: string;
  pool?: Pool;
  table?: string;
}



export class PostgresStore implements Store {

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

  private async getWithClient<T>(client: PoolClient, key: string): Promise<T | null>{
    const result = await client.query(
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
      await this.deleteWithClient(client, key);
      return null;
    }

    return row.value as T;
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

  private async setWithClient<T>(client: PoolClient, key: string, value: T, ttl?: number): Promise<void>{
    const expires_at = ttl != undefined ? new Date(Date.now() + ttl) : undefined;

    await client.query(
      `INSERT INTO ${this.table} (key, value, expires_at) VALUES ($1, $2, $3) ON CONFLICT(KEY) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
      [key, JSON.stringify(value), expires_at],
    );
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expires_at = ttl != undefined ? new Date(Date.now() + ttl) : undefined;

    await this.pool.query(
      `INSERT INTO ${this.table} (key, value, expires_at) VALUES ($1, $2, $3) ON CONFLICT(KEY) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
      [key, JSON.stringify(value), expires_at],
    );
  }

  private async deleteWithClient(client: PoolClient, key: string): Promise<void>{
     await client.query(`DELETE FROM ${this.table} WHERE key=$1`, [key]);
  }

  async delete(key: string): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.table} WHERE key=$1`, [key]);
  }

  private hashKey(key: string): bigint {
    const hash = createHash('sha256').update(key).digest();

    return hash.readBigInt64BE(0);
  }

  private async acquireLock(client: PoolClient, key: string) {
    const lockId = this.hashKey(key);
    
    await client.query(
      `SELECT pg_advisory_lock($1)`,
      [lockId]
    )

    return lockId
  }

  private async releaseLock(client: PoolClient, lockId: bigint) {
    
    await client.query(
      `SELECT pg_advisory_unlock($1)`,
      [lockId]
    )
  }

  async update<T, R>(key: string, updater: (current: T | null) => { value: T; ttl?: number; result: R; }): Promise<R> {
    const client = await this.pool.connect();
    let lockId: bigint | undefined;
    try{
        lockId = await this.acquireLock(client, key);
        const current = await this.getWithClient<T>(client, key);

        const update = updater(current);

        await this.setWithClient<T>(client, key, update.value, update.ttl);

        return update.result
      }
      finally{
        if(lockId != undefined){
          await this.releaseLock(client, lockId);
        }
        client.release();
      }
  }

}
