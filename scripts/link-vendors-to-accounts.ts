/**
 * Fuzzy-link vendors to user_account members.
 *
 * The migration 20260521000003_vendors_user_account_link.sql adds
 * vendors.user_account_id and backfills only the vendors whose name is an
 * exact normalized match for exactly one user_account.full_name. This script
 * handles the messier remainder: name-order differences ("Dolatre, Roland"
 * vs "ROLAND DOLATRE"), extra middle names, etc.
 *
 * Reads from .env.import (falls back to plain SUPABASE_* if TARGET_* unset):
 *   TARGET_SUPABASE_URL / TARGET_SUPABASE_SERVICE_ROLE_KEY
 *
 * Default (no flag): writes vendor-account-link.json with three buckets:
 *   - matched    — confident 1:1 match (would be written on --apply)
 *   - ambiguous  — vendor name maps to multiple accounts (needs manual pick)
 *   - unmatched  — no candidate found
 *
 * With --apply: writes the `matched` bucket to vendors.user_account_id.
 * Only fills vendors that currently have a NULL user_account_id.
 *
 *   npx tsx scripts/link-vendors-to-accounts.ts          # write report
 *   npx tsx scripts/link-vendors-to-accounts.ts --apply  # commit confident matches
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const ENV_FILE = path.resolve(process.cwd(), ".env.import");
const OUT_FILE = path.resolve(process.cwd(), "vendor-account-link.json");

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

type Vendor = { id: string; name: string; user_account_id: number | null };
type Account = { user_account_id: number; full_name: string | null };

// Normalize a name to a sorted set of alphanumeric tokens, so that
// "Dolatre, Roland" and "ROLAND DOLATRE" collapse to the same key.
function tokenKey(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

async function main() {
  await loadEnv();

  const url = process.env.TARGET_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error(
      "Missing TARGET_SUPABASE_URL / TARGET_SUPABASE_SERVICE_ROLE_KEY in .env.import",
    );
    process.exit(1);
  }

  const apply = process.argv.includes("--apply");
  const db = createClient(url, key, { auth: { persistSession: false } });

  console.log("Fetching vendors and user_account…");

  const { data: vendorRows, error: vendorError } = await db
    .from("vendors")
    .select("id,name,user_account_id");
  if (vendorError) throw vendorError;

  const { data: accountRows, error: accountError } = await db
    .from("user_account")
    .select("user_account_id,full_name");
  if (accountError) throw accountError;

  const vendors = (vendorRows ?? []) as Vendor[];
  const accounts = (accountRows ?? []) as Account[];

  // Index accounts by token key.
  const accountsByKey = new Map<string, Account[]>();
  for (const account of accounts) {
    if (!account.full_name || !account.full_name.trim()) continue;
    const k = tokenKey(account.full_name);
    if (!k) continue;
    const bucket = accountsByKey.get(k) ?? [];
    bucket.push(account);
    accountsByKey.set(k, bucket);
  }

  const matched: { vendorId: string; vendorName: string; userAccountId: number; accountName: string }[] = [];
  const ambiguous: { vendorId: string; vendorName: string; candidates: { userAccountId: number; accountName: string }[] }[] = [];
  const unmatched: { vendorId: string; vendorName: string }[] = [];
  let alreadyLinked = 0;

  for (const vendor of vendors) {
    if (vendor.user_account_id != null) {
      alreadyLinked += 1;
      continue;
    }
    if (!vendor.name || !vendor.name.trim()) {
      unmatched.push({ vendorId: vendor.id, vendorName: vendor.name });
      continue;
    }
    const candidates = accountsByKey.get(tokenKey(vendor.name)) ?? [];
    if (candidates.length === 1) {
      matched.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        userAccountId: candidates[0].user_account_id,
        accountName: candidates[0].full_name ?? "",
      });
    } else if (candidates.length > 1) {
      ambiguous.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        candidates: candidates.map((c) => ({
          userAccountId: c.user_account_id,
          accountName: c.full_name ?? "",
        })),
      });
    } else {
      unmatched.push({ vendorId: vendor.id, vendorName: vendor.name });
    }
  }

  await fs.writeFile(
    OUT_FILE,
    JSON.stringify({ matched, ambiguous, unmatched }, null, 2),
    "utf8",
  );

  console.log(`  vendors:        ${vendors.length}`);
  console.log(`  already linked: ${alreadyLinked}`);
  console.log(`Report written to vendor-account-link.json:`);
  console.log(`  matched:   ${matched.length}`);
  console.log(`  ambiguous: ${ambiguous.length}`);
  console.log(`  unmatched: ${unmatched.length}`);

  if (!apply) {
    console.log("\nRun with --apply to write the matched links to vendors.user_account_id.");
    return;
  }

  console.log(`\nApplying ${matched.length} confident links…`);
  let written = 0;
  for (const m of matched) {
    const { error } = await db
      .from("vendors")
      .update({ user_account_id: m.userAccountId })
      .eq("id", m.vendorId)
      .is("user_account_id", null);
    if (error) {
      console.warn(`  failed ${m.vendorName}: ${error.message}`);
      continue;
    }
    written += 1;
  }
  console.log(`  done — ${written} vendors linked.`);
  if (ambiguous.length) {
    console.log(
      `  ${ambiguous.length} ambiguous vendor(s) left untouched — resolve manually in vendor-account-link.json.`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
