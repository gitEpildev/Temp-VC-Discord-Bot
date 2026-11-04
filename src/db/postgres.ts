import { AsyncLocalStorage } from "node:async_hooks";
import pg from "pg";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let pool: pg.Pool | null = null;
export const databaseConnection = new AsyncLocalStorage<pg.PoolClient>();

export interface GuildConfig {
  guildId: string;
  enabled: number; // 1 = on, 0 = off
  categoryId: string | null;
  creatorChannelId: string | null; // "Join To Create" channel
  controlPanelChannelId: string | null;
  controlPanelMessageId: string | null;
  logChannelId: string | null;
  nameTemplate: string;
  brandColor: string;
  cooldownSeconds: number;
  deleteDelaySeconds: number;
  claimTimeoutSeconds: number;
  maxChannelsPerUser: number;
}

export interface VoiceChannel {
  voiceChannelId: string;
  guildId: string;
  textChannelId: string;
  ownerId: string;
  createdAt: number;
  lastOwnerSeenAt: number;
  locked: boolean;
  adminLocked: boolean;
}

export interface Cooldown {
  guildId: string;
  userId: string;
  lastCreatedAt: number;
}

export function getPool(): pg.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    pool = new pg.Pool({
      connectionString: url,
      max: 10,
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  const p = databaseConnection.getStore() ?? getPool();
  return p.query<T>(sql, params);
}

export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  const result = await query<T>(sql, params);
  return (result.rows[0] as T | undefined) ?? null;
}

export async function queryAll<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await query<T>(sql, params);
  return result.rows as T[];
}

export async function initDb(): Promise<void> {
  const migrationsDir = join(__dirname, "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const path = join(migrationsDir, file);
    const sql = readFileSync(path, "utf-8");
    await query(sql);
  }
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
