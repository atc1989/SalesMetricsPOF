/**
 * Copy data from the old BillingSystem Supabase to the salesmetrics Supabase.
 *
 * Reads two service-role credentials from .env.import:
 *   SOURCE_SUPABASE_URL
 *   SOURCE_SUPABASE_SERVICE_ROLE_KEY
 *   TARGET_SUPABASE_URL
 *   TARGET_SUPABASE_SERVICE_ROLE_KEY
 *
 * Run AFTER applying the Phase 2 migrations to the target project.
 *   npx tsx scripts/migrate-billing-data.ts            # dry run, prints counts
 *   npx tsx scripts/migrate-billing-data.ts --apply    # actually copy
 *
 * Idempotent: uses upsert by primary key. Re-running is safe.
 */

import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
  } catch {
    // .env.import optional — env may already be set
  }
}

const TABLES_IN_ORDER = [
  "vendors",
  "bills",
  "bill_breakdowns",
  "bill_attachments",
  "pcf_transactions",
  "event_requests",
  "form_submissions",
  "print_logs",
] as const;

const PAGE_SIZE = 500;

async function copyTable(source: SupabaseClient, target: SupabaseClient, table: string, apply: boolean) {
  let from = 0;
  let total = 0;
  while (true) {
    const { data, error, count } = await source
      .from(table)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: true, nullsFirst: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      // Some tables may not have created_at — retry without explicit order
      const { data: data2, error: error2 } = await source.from(table).select("*").range(from, from + PAGE_SIZE - 1);
      if (error2) throw error2;
      if (!data2 || data2.length === 0) break;
      if (apply) {
        const { error: upsertErr } = await target.from(table).upsert(data2, { onConflict: "id" });
        if (upsertErr) throw upsertErr;
      }
      total += data2.length;
      if (data2.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
      continue;
    }

    if (!data || data.length === 0) break;
    if (apply) {
      const { error: upsertErr } = await target.from(table).upsert(data, { onConflict: "id" });
      if (upsertErr) throw upsertErr;
    }
    total += data.length;
    if (typeof count === "number" && from + data.length >= count) break;
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return total;
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const wait = 500 * Math.pow(2, i);
      console.warn(`    retry ${label} (attempt ${i + 1}/${attempts}): ${(err as Error).message} — sleeping ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

async function copyBillAttachments(source: SupabaseClient, target: SupabaseClient, apply: boolean) {
  // List all objects in the source bucket and re-upload to target.
  const bucket = "bill_attachments";
  const queue: string[] = [""];
  let copied = 0;
  let failed = 0;

  while (queue.length) {
    const prefix = queue.shift()!;
    const data = await withRetry(`list:${prefix || "/"}`, async () => {
      const { data, error } = await source.storage.from(bucket).list(prefix, { limit: 1000 });
      if (error) throw error;
      return data;
    });
    if (!data) continue;
    for (const entry of data) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        queue.push(fullPath);
        continue;
      }
      if (!apply) {
        copied += 1;
        continue;
      }
      try {
        await withRetry(`copy:${fullPath}`, async () => {
          const { data: blob, error: dlErr } = await source.storage.from(bucket).download(fullPath);
          if (dlErr) throw dlErr;
          const arrayBuffer = await blob.arrayBuffer();
          const { error: upErr } = await target.storage
            .from(bucket)
            .upload(fullPath, new Uint8Array(arrayBuffer), { upsert: true, contentType: blob.type });
          if (upErr && !upErr.message.includes("already exists")) throw upErr;
        });
        copied += 1;
      } catch (err) {
        console.warn(`    gave up on ${fullPath}: ${(err as Error).message}`);
        failed += 1;
      }
    }
  }
  if (failed) console.log(`  ${failed} file(s) failed after retries — re-run --apply to pick them up.`);
  return copied;
}

async function main() {
  await loadEnv();

  const apply = process.argv.includes("--apply");
  const sourceUrl = process.env.SOURCE_SUPABASE_URL;
  const sourceKey = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;
  const targetUrl = process.env.TARGET_SUPABASE_URL;
  const targetKey = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;

  if (!sourceUrl || !sourceKey || !targetUrl || !targetKey) {
    console.error("Missing one of SOURCE_SUPABASE_URL/KEY or TARGET_SUPABASE_URL/KEY in .env.import");
    process.exit(1);
  }

  const source = createClient(sourceUrl, sourceKey, { auth: { persistSession: false } });
  const target = createClient(targetUrl, targetKey, { auth: { persistSession: false } });

  console.log(apply ? "APPLY mode — writing to target." : "DRY RUN — no writes. Pass --apply to copy.");

  for (const table of TABLES_IN_ORDER) {
    try {
      const n = await copyTable(source, target, table, apply);
      console.log(`  ${table}: ${n} rows ${apply ? "copied" : "would copy"}`);
    } catch (err) {
      console.warn(`  ${table}: skipped — ${(err as Error).message}`);
    }
  }

  try {
    const n = await copyBillAttachments(source, target, apply);
    console.log(`  storage:bill_attachments: ${n} files ${apply ? "copied" : "would copy"}`);
  } catch (err) {
    console.warn(`  storage:bill_attachments: skipped — ${(err as Error).message}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
