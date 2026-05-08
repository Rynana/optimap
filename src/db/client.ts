import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";
import type { SqlDriver } from "./driver";

let pluginDbPromise: Promise<Database> | null = null;
let cachedDataDir: string | null = null;
let cachedDbPath: string | null = null;

export async function getDataDir(): Promise<string> {
  if (cachedDataDir) return cachedDataDir;
  cachedDataDir = await invoke<string>("get_app_data_dir");
  console.info(`[OptiMap] Data folder: ${cachedDataDir}`);
  return cachedDataDir;
}

export async function getDbPath(): Promise<string> {
  if (cachedDbPath) return cachedDbPath;
  const dir = await getDataDir();
  cachedDbPath = await join(dir, "optimap.db");
  return cachedDbPath;
}

async function getPluginDb(): Promise<Database> {
  if (pluginDbPromise) return pluginDbPromise;
  pluginDbPromise = (async () => {
    const dbPath = await getDbPath();
    return Database.load(`sqlite:${dbPath}`);
  })();
  return pluginDbPromise;
}

function pluginToDriver(plugin: Database): SqlDriver {
  return {
    async execute(sql: string, params?: unknown[]): Promise<void> {
      await plugin.execute(sql, params ?? []);
    },
    async select<T>(sql: string, params?: unknown[]): Promise<T> {
      return (await plugin.select<T>(sql, params ?? [])) as T;
    },
  };
}

export async function getSqlDriver(): Promise<SqlDriver> {
  return pluginToDriver(await getPluginDb());
}

type ProxyMethod = "run" | "all" | "values" | "get";

export function createProxyCallback(
  driverProvider: () => Promise<SqlDriver>,
): (sql: string, params: unknown[], method: ProxyMethod) => Promise<{ rows: unknown[] }> {
  return async (sql, params, method) => {
    const driver = await driverProvider();
    if (method === "run") {
      await driver.execute(sql, params);
      return { rows: [] };
    }
    const result = await driver.select<Array<Record<string, unknown>>>(sql, params);
    if (method === "get") {
      const first = result[0];
      return { rows: first ? Object.values(first) : [] };
    }
    return { rows: result.map((row) => Object.values(row)) };
  };
}

export const db = drizzle(createProxyCallback(getSqlDriver), { schema });

/**
 * Build a Drizzle instance backed by an arbitrary {@link SqlDriver}. Used in
 * tests where we drive Drizzle against an in-memory better-sqlite3 database.
 */
export function makeDb(driver: SqlDriver) {
  return drizzle(
    createProxyCallback(async () => driver),
    { schema },
  );
}
