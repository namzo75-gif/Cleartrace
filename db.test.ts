import { beforeEach, describe, expect, test, vi } from "vitest";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const dbPath = path.join(process.cwd(), "data", "cleartrace.sqlite");

describe("database schema initialization", () => {
  beforeEach(() => {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    rmSync(dbPath, { force: true });
    vi.resetModules();
  });

  test("applies the SQL migrations and creates the expected tables", async () => {
    const { db, initializeSchema } = await import("./db.js");

    await initializeSchema();

    const tables = db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'scan_runs', 'brokers', 'monitoring_events', 'subscriptions') ORDER BY name",
    );
    const subscriptionColumns = db
      .query("PRAGMA table_info('subscriptions')")
      .map((row: { name: string }) => row.name);

    expect(tables.map((row: { name: string }) => row.name)).toEqual([
      "brokers",
      "monitoring_events",
      "scan_runs",
      "subscriptions",
      "users",
    ]);
    expect(subscriptionColumns).toEqual(
      expect.arrayContaining(["tier", "billing_cycle", "seats", "seat_limit"]),
    );
  });
});
