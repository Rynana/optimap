import type { SqlDriver } from "./driver";

export async function getMetaFlag(driver: SqlDriver, key: string): Promise<string | null> {
  const rows = await driver.select<Array<{ value: string }>>(
    "SELECT value FROM meta WHERE key = ?",
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function setMetaFlag(driver: SqlDriver, key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  await driver.execute(
    `INSERT INTO meta (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, now],
  );
}

export async function deleteMetaFlag(driver: SqlDriver, key: string): Promise<void> {
  await driver.execute("DELETE FROM meta WHERE key = ?", [key]);
}
