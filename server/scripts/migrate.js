import dotenv from "dotenv";
import fs from "fs/promises";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";
import { mysqlOptions } from "../src/config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const admin = await mysql.createConnection({ ...mysqlOptions, database: undefined });
await admin.query(`CREATE DATABASE IF NOT EXISTS \`${mysqlOptions.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await admin.end();
const connection = await mysql.createConnection({ ...mysqlOptions, multipleStatements: true });
try {
  await connection.query("CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  const [appliedRows] = await connection.query("SELECT name FROM schema_migrations");
  const applied = new Set(appliedRows.map(row => row.name));
  const files = (await fs.readdir(path.resolve(__dirname, "../db/migrations"))).filter(name => name.endsWith(".sql")).sort();
  for (const name of files) { if (!applied.has(name)) { await connection.query(await fs.readFile(path.resolve(__dirname, "../db/migrations", name), "utf8")); await connection.query("INSERT INTO schema_migrations (name) VALUES (?)", [name]); console.log(`Applied ${name}`); } }
} finally { await connection.end(); }
