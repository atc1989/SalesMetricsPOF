/**
 * Reconcile user_account between BillingSystem and salesmetrics Supabase projects.
 *
 * Reads from .env.import:
 *   SOURCE_SUPABASE_URL / SOURCE_SUPABASE_SERVICE_ROLE_KEY  (BillingSystem)
 *   TARGET_SUPABASE_URL / TARGET_SUPABASE_SERVICE_ROLE_KEY  (salesmetrics)
 *
 * Default (no flag): writes user-account-diff.json with three buckets:
 *   - onlyInBilling      — rows present in source but not in target (importable)
 *   - onlyInSalesmetrics — rows present in target but not in source (informational)
 *   - conflicts          — same user_name, differing other fields (manual review)
 *
 * With --apply:
 *   - Upserts onlyInBilling rows into target.
 *   - Does NOT touch conflicts unless --resolve-conflicts is also passed
 *     (in which case Billing values are written over target — review diff first).
 *
 *   npx tsx scripts/reconcile-user-accounts.ts            # write diff JSON
 *   npx tsx scripts/reconcile-user-accounts.ts --apply    # import Billing-only rows
 *   npx tsx scripts/reconcile-user-accounts.ts --apply --resolve-conflicts
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const ENV_FILE = path.resolve(process.cwd(), ".env.import");
const OUT_FILE = path.resolve(process.cwd(), "user-account-diff.json");

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
  } catch {
    // optional
  }
}

type Row = Record<string, unknown> & { user_name: string };

const COMPARE_FIELDS = [
  "full_name",
  "sponsor",
  "placement",
  "group",
  "account_type",
  "zero_one",
  "code_payment",
  "city",
  "province",
  "region",
  "country",
];

function normalize(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

async function fetchAll(client: ReturnType<typeof createClient>): Promise<Row[]> {
  const rows: Row[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await client.from("user_account").select("*").range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  await loadEnv();
  const apply = process.argv.includes("--apply");
  const resolveConflicts = process.argv.includes("--resolve-conflicts");

  const sourceUrl = process.env.SOURCE_SUPABASE_URL;
  const sourceKey = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;
  const targetUrl = process.env.TARGET_SUPABASE_URL;
  const targetKey = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;

  if (!sourceUrl || !sourceKey || !targetUrl || !targetKey) {
    console.error("Missing SOURCE/TARGET Supabase env in .env.import");
    process.exit(1);
  }

  const source = createClient(sourceUrl, sourceKey, { auth: { persistSession: false } });
  const target = createClient(targetUrl, targetKey, { auth: { persistSession: false } });

  console.log("Fetching user_account from both projects…");
  const [sourceRows, targetRows] = await Promise.all([fetchAll(source), fetchAll(target)]);
  console.log(`  source: ${sourceRows.length} rows`);
  console.log(`  target: ${targetRows.length} rows`);

  const targetByKey = new Map<string, Row>();
  for (const r of targetRows) targetByKey.set(normalize(r.user_name), r);

  const onlyInBilling: Row[] = [];
  const conflicts: { user_name: string; source: Row; target: Row; diff: string[] }[] = [];
  const matched = new Set<string>();

  for (const s of sourceRows) {
    const key = normalize(s.user_name);
    const t = targetByKey.get(key);
    if (!t) {
      onlyInBilling.push(s);
      continue;
    }
    matched.add(key);
    const diff = COMPARE_FIELDS.filter((f) => normalize(s[f]) !== normalize(t[f]));
    if (diff.length) conflicts.push({ user_name: s.user_name, source: s, target: t, diff });
  }

  const onlyInSalesmetrics: Row[] = targetRows.filter((r) => !matched.has(normalize(r.user_name)));

  await fs.writeFile(
    OUT_FILE,
    JSON.stringify(
      { onlyInBilling, onlyInSalesmetrics, conflicts, generatedAt: new Date().toISOString() },
      null,
      2,
    ),
    "utf8",
  );

  console.log("Diff written to user-account-diff.json:");
  console.log(`  onlyInBilling:      ${onlyInBilling.length}`);
  console.log(`  onlyInSalesmetrics: ${onlyInSalesmetrics.length}`);
  console.log(`  conflicts:          ${conflicts.length}`);

  if (!apply) {
    console.log("\nRun with --apply to insert onlyInBilling rows into salesmetrics.");
    return;
  }

  if (onlyInBilling.length) {
    console.log(`\nUpserting ${onlyInBilling.length} Billing-only rows into salesmetrics…`);
    const toInsert = onlyInBilling.map((r) => {
      const { user_account_id: _ignored, ...rest } = r as Row & { user_account_id?: unknown };
      return rest;
    });
    const { error } = await target.from("user_account").upsert(toInsert, { onConflict: "user_name" });
    if (error) throw error;
    console.log("  done.");
  }

  if (resolveConflicts && conflicts.length) {
    console.log(`\nResolving ${conflicts.length} conflicts with Billing values…`);
    const toUpdate = conflicts.map((c) => {
      const { user_account_id: _ignored, ...rest } = c.source as Row & { user_account_id?: unknown };
      return rest;
    });
    const { error } = await target.from("user_account").upsert(toUpdate, { onConflict: "user_name" });
    if (error) throw error;
    console.log("  done.");
  } else if (conflicts.length) {
    console.log(`\n${conflicts.length} conflicts left untouched. Re-run with --resolve-conflicts to overwrite from Billing.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
