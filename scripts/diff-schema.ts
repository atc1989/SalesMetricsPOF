/**
 * One-shot: for each Billing table, list its actual columns in SOURCE Supabase
 * by reading one row and printing the keys + JS typeof values. Cheap, no
 * information_schema permissions required.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const ENV_FILE = path.resolve(process.cwd(), ".env.import");

async function loadEnv() {
  try {
    const text = await fs.readFile(ENV_FILE, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}

const TABLES = [
  "vendors",
  "bills",
  "bill_breakdowns",
  "bill_attachments",
  "pcf_transactions",
  "event_requests",
  "form_submissions",
  "print_logs",
];

function inferType(v: unknown): string {
  if (v === null || v === undefined) return "?";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return Number.isInteger(v) ? "integer/numeric" : "numeric";
  if (typeof v === "object") return Array.isArray(v) ? "array/jsonb" : "jsonb";
  if (typeof v === "string") {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return "uuid";
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return "timestamptz";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return "date";
    return "text";
  }
  return "?";
}

async function main() {
  await loadEnv();
  const url = process.env.SOURCE_SUPABASE_URL!;
  const key = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    console.error("Set SOURCE_SUPABASE_URL / SOURCE_SUPABASE_SERVICE_ROLE_KEY in .env.import");
    process.exit(1);
  }
  const src = createClient(url, key, { auth: { persistSession: false } });

  for (const t of TABLES) {
    const { data, error } = await src.from(t).select("*").limit(1);
    if (error) {
      console.log(`\n## ${t}: ERROR — ${error.message}`);
      continue;
    }
    if (!data || data.length === 0) {
      const { data: empty } = await src.from(t).select("*").limit(0);
      console.log(`\n## ${t}: empty table${empty ? "" : ""}`);
      continue;
    }
    const row = data[0] as Record<string, unknown>;
    console.log(`\n## ${t}`);
    for (const [col, val] of Object.entries(row)) {
      console.log(`  ${col.padEnd(28)} ${inferType(val)}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
