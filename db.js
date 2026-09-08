import Database from "better-sqlite3";
import fs from "fs/promises";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usePostgres = process.env.CLEARTRACE_DB === "postgres";

function splitSqlStatements(sql) {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function createDatabase() {
  if (usePostgres) {
    const { Pool } = pg;
    const pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        "postgres://postgres:postgres@localhost:5432/cleartrace",
    });

    return {
      kind: "postgres",
      pool,
      async query(text, params = []) {
        const result = await pool.query(text, params);
        return result.rows;
      },
      async run(text, params = []) {
        await pool.query(text, params);
      },
      async exec(text) {
        for (const statement of splitSqlStatements(text)) {
          await pool.query(statement);
        }
      },
    };
  }

  const dbPath = path.join(__dirname, "data", "cleartrace.sqlite");
  const sqlite = new Database(dbPath);

  return {
    kind: "sqlite",
    sqlite,
    query(text, params = []) {
      const stmt = sqlite.prepare(text);
      return stmt.all(...params);
    },
    run(text, params = []) {
      const stmt = sqlite.prepare(text);
      stmt.run(...params);
    },
    exec(text) {
      sqlite.exec(text);
    },
  };
}

export const db = createDatabase();

export async function initializeSchema() {
  const migrationDir = path.join(__dirname, "migrations");
  const files = (await fs.readdir(migrationDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationDir, file), "utf8");
    await db.exec(sql);
  }
}
