/**
 * Diagnose + link vendors to user_account members.
 *
 * vendors.name turned out to hold USERNAMES, not full names. There are two
 * username-bearing tables — user_account (user_name) and users (username) —
 * so this script first tests the 178 vendor names against every candidate
 * column and prints a hit-count breakdown, then links what it can.
 *
 * The link TARGET is always user_account.user_account_id (that is the member
 * table the rollup page joins on). Matching is exact, case-insensitive,
 * whitespace-trimmed.
 *
 * Reads from .env.import (falls back to plain SUPABASE_* if TARGET_* unset):
 *   TARGET_SUPABASE_URL / TARGET_SUPABASE_SERVICE_ROLE_KEY
 *
 *   npx tsx scripts/link-vendors-to-accounts.ts          # diagnose + write report
 *   npx tsx scripts/link-vendors-to-accounts.ts --apply  # also write the links
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
type Account = { user_account_id: number; user_name: string | null; full_name: string | null };
type AppUser = { user_id: number; username: string | null; name: string | null };

const norm = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase();

// Pull every row from a table in pages (Supabase caps a select at 1000).
async function fetchAll<T>(
  db: ReturnType<typeof createClient>,
  table: string,
  columns: string,
): Promise<T[]> {
  const pageSize = 1000;
  let from = 0;
  const all: T[] = [];
  for (;;) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

// Build a normalized-value -> rows index, skipping blank keys.
function indexBy<T>(rows: T[], getKey: (row: T) => string | null | undefined) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = norm(getKey(row));
    if (!k) continue;
    const bucket = map.get(k) ?? [];
    bucket.push(row);
    map.set(k, bucket);
  }
  return map;
}

async function main() {
  await loadEnv();

  const url = process.env.TARGET_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing TARGET_SUPABASE_URL / TARGET_SUPABASE_SERVICE_ROLE_KEY in .env.import");
    process.exit(1);
  }

  const apply = process.argv.includes("--apply");
  const db = createClient(url, key, { auth: { persistSession: false } });

  console.log("Fetching vendors, user_account, users…");
  const vendors = await fetchAll<Vendor>(db, "vendors", "id,name,user_account_id");
  const accounts = await fetchAll<Account>(
    db,
    "user_account",
    "user_account_id,user_name,full_name",
  );
  const users = await fetchAll<AppUser>(db, "users", "user_id,username,name");

  console.log(`  vendors:       ${vendors.length}`);
  console.log(`  user_account:  ${accounts.length}`);
  console.log(`  users:         ${users.length}`);

  // Candidate indexes.
  const byAccountUserName = indexBy(accounts, (a) => a.user_name);
  const byAccountFullName = indexBy(accounts, (a) => a.full_name);
  const byUsersUsername = indexBy(users, (u) => u.username);
  const byUsersName = indexBy(users, (u) => u.name);

  // Diagnostic: how many vendor names hit each candidate column?
  let hitAccountUserName = 0;
  let hitAccountFullName = 0;
  let hitUsersUsername = 0;
  let hitUsersName = 0;
  for (const vendor of vendors) {
    const k = norm(vendor.name);
    if (!k) continue;
    if (byAccountUserName.has(k)) hitAccountUserName += 1;
    if (byAccountFullName.has(k)) hitAccountFullName += 1;
    if (byUsersUsername.has(k)) hitUsersUsername += 1;
    if (byUsersName.has(k)) hitUsersName += 1;
  }

  console.log("\nVendor-name match counts by candidate column:");
  console.log(`  user_account.user_name : ${hitAccountUserName} / ${vendors.length}`);
  console.log(`  user_account.full_name : ${hitAccountFullName} / ${vendors.length}`);
  console.log(`  users.username         : ${hitUsersUsername} / ${vendors.length}`);
  console.log(`  users.name             : ${hitUsersName} / ${vendors.length}`);

  // Diagnostic: which table does daily_sales.username actually point at?
  // Sample distinct, non-blank usernames and test them against both tables.
  const dailySalesRows = await fetchAll<{ username: string | null }>(
    db,
    "daily_sales",
    "username",
  );
  const distinctSalesUsernames = Array.from(
    new Set(dailySalesRows.map((r) => norm(r.username)).filter(Boolean)),
  );
  let salesHitAccountUserName = 0;
  let salesHitUsersUsername = 0;
  for (const u of distinctSalesUsernames) {
    if (byAccountUserName.has(u)) salesHitAccountUserName += 1;
    if (byUsersUsername.has(u)) salesHitUsersUsername += 1;
  }
  console.log(
    `\ndaily_sales.username — ${distinctSalesUsernames.length} distinct non-blank values:`,
  );
  console.log(
    `  match user_account.user_name : ${salesHitAccountUserName} / ${distinctSalesUsernames.length}`,
  );
  console.log(
    `  match users.username         : ${salesHitUsersUsername} / ${distinctSalesUsernames.length}`,
  );

  // Resolve a vendor to a user_account_id. Prefer a direct user_account
  // match; otherwise bridge through users (users.username -> users.zero_one
  // is not a member key, so we bridge by the user's name into
  // user_account.full_name as a fallback).
  const matched: { vendorId: string; vendorName: string; userAccountId: number; via: string }[] = [];
  const ambiguous: { vendorId: string; vendorName: string; note: string }[] = [];
  const unmatched: { vendorId: string; vendorName: string }[] = [];
  let alreadyLinked = 0;

  for (const vendor of vendors) {
    if (vendor.user_account_id != null) {
      alreadyLinked += 1;
      continue;
    }
    const k = norm(vendor.name);
    if (!k) {
      unmatched.push({ vendorId: vendor.id, vendorName: vendor.name });
      continue;
    }

    // Strategy 1: vendor name == user_account.user_name (direct).
    const directAccounts = byAccountUserName.get(k);
    if (directAccounts && directAccounts.length === 1) {
      matched.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        userAccountId: directAccounts[0].user_account_id,
        via: "user_account.user_name",
      });
      continue;
    }
    if (directAccounts && directAccounts.length > 1) {
      ambiguous.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        note: `${directAccounts.length} user_account rows share this user_name`,
      });
      continue;
    }

    // Strategy 2: vendor name == users.username, then bridge users.name
    // -> user_account.full_name.
    const matchedUsers = byUsersUsername.get(k);
    if (matchedUsers && matchedUsers.length >= 1) {
      const bridged = matchedUsers
        .flatMap((u) => byAccountFullName.get(norm(u.name)) ?? [])
        .filter((a, i, arr) => arr.findIndex((x) => x.user_account_id === a.user_account_id) === i);
      if (bridged.length === 1) {
        matched.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          userAccountId: bridged[0].user_account_id,
          via: "users.username -> users.name -> user_account.full_name",
        });
        continue;
      }
      if (bridged.length > 1) {
        ambiguous.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          note: `users.username bridges to ${bridged.length} user_account rows`,
        });
        continue;
      }
      ambiguous.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        note: "matched users.username but no user_account bridge by name",
      });
      continue;
    }

    unmatched.push({ vendorId: vendor.id, vendorName: vendor.name });
  }

  await fs.writeFile(
    OUT_FILE,
    JSON.stringify(
      {
        diagnostics: {
          vendors: vendors.length,
          vendorNameMatches: {
            accountUserName: hitAccountUserName,
            accountFullName: hitAccountFullName,
            usersUsername: hitUsersUsername,
            usersName: hitUsersName,
          },
          dailySalesUsername: {
            distinctValues: distinctSalesUsernames.length,
            matchAccountUserName: salesHitAccountUserName,
            matchUsersUsername: salesHitUsersUsername,
          },
        },
        matched,
        ambiguous,
        unmatched,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`\nReport written to vendor-account-link.json:`);
  console.log(`  already linked: ${alreadyLinked}`);
  console.log(`  matched:        ${matched.length}`);
  console.log(`  ambiguous:      ${ambiguous.length}`);
  console.log(`  unmatched:      ${unmatched.length}`);

  if (!apply) {
    console.log("\nReview the diagnostics above, then re-run with --apply to write links.");
    return;
  }

  console.log(`\nApplying ${matched.length} links…`);
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
