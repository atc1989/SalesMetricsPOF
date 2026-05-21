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
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

// Honorific / non-name tokens to drop before keying.
const STOP_TOKENS = new Set(["EMPLOYEE", "EMP", "MR", "MRS", "MS", "DR", "DRA"]);

function nameTokens(value: string | null | undefined): string[] {
  return (value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP_TOKENS.has(t));
}

// Token-sort key: order-insensitive but space-sensitive.
function tokenKey(value: string | null | undefined): string {
  return nameTokens(value).sort().join(" ").toLowerCase();
}

// Anagram key: every letter of the name, sorted. Order-, space-, comma-,
// and punctuation-insensitive. "JOY ANN BATALLONES" and "BATALLONES,JOYANN"
// produce the same key. Honorifics dropped first.
function anagramKey(value: string | null | undefined): string {
  return nameTokens(value)
    .join("")
    .split("")
    .sort()
    .join("")
    .toLowerCase();
}

// Pull every row from a table in pages (Supabase caps a select at 1000).
async function fetchAll<T>(
  db: SupabaseClient,
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

  console.log("\nVendor-name EXACT match counts by candidate column:");
  console.log(`  user_account.user_name : ${hitAccountUserName} / ${vendors.length}`);
  console.log(`  user_account.full_name : ${hitAccountFullName} / ${vendors.length}`);
  console.log(`  users.username         : ${hitUsersUsername} / ${vendors.length}`);
  console.log(`  users.name             : ${hitUsersName} / ${vendors.length}`);

  // Token-sort (order-insensitive) match against the name columns.
  const byAccountFullNameToken = indexBy(accounts, (a) => tokenKey(a.full_name));
  const byUsersNameToken = indexBy(users, (u) => tokenKey(u.name));
  let tokenHitAccountFullName = 0;
  let tokenHitUsersName = 0;
  for (const vendor of vendors) {
    const tk = tokenKey(vendor.name);
    if (!tk) continue;
    if (byAccountFullNameToken.has(tk)) tokenHitAccountFullName += 1;
    if (byUsersNameToken.has(tk)) tokenHitUsersName += 1;
  }
  console.log("\nVendor-name TOKEN-SORT match counts (order-insensitive):");
  console.log(`  user_account.full_name : ${tokenHitAccountFullName} / ${vendors.length}`);
  console.log(`  users.name             : ${tokenHitUsersName} / ${vendors.length}`);

  // Anagram match — every letter sorted; neutralizes comma + missing space
  // + word order all at once.
  const byAccountAnagram = indexBy(accounts, (a) => anagramKey(a.full_name));
  let anagramHitAccountFullName = 0;
  for (const vendor of vendors) {
    const ak = anagramKey(vendor.name);
    if (ak && byAccountAnagram.has(ak)) anagramHitAccountFullName += 1;
  }
  console.log("\nVendor-name ANAGRAM match counts (letter-multiset):");
  console.log(`  user_account.full_name : ${anagramHitAccountFullName} / ${vendors.length}`);

  // Print samples so the actual formats are visible.
  console.log("\nSample vendor names (first 12):");
  for (const v of vendors.slice(0, 12)) console.log(`  - ${JSON.stringify(v.name)}`);
  console.log("\nSample user_account (first 12): user_name | full_name");
  for (const a of accounts.slice(0, 12)) {
    console.log(`  - ${JSON.stringify(a.user_name)} | ${JSON.stringify(a.full_name)}`);
  }
  console.log("\nSample users (first 12): username | name");
  for (const u of users.slice(0, 12)) {
    console.log(`  - ${JSON.stringify(u.username)} | ${JSON.stringify(u.name)}`);
  }

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

  // Resolve a vendor to a user_account_id.
  //   Strategy 1 (exact anagram): vendor letters == account full_name
  //     letters. High confidence.
  //   Strategy 2 (subset): vendor letters are a sub-multiset of exactly one
  //     account — catches vendors that lack a middle name the account has.
  //     Medium confidence; only used when a single account contains them.
  const matched: {
    vendorId: string;
    vendorName: string;
    userAccountId: number;
    accountName: string;
    via: string;
  }[] = [];
  const ambiguous: { vendorId: string; vendorName: string; note: string }[] = [];
  const unmatched: { vendorId: string; vendorName: string }[] = [];
  let alreadyLinked = 0;

  // sub-multiset test on two letter-sorted strings.
  const isSubsetOf = (small: string, big: string): boolean => {
    let i = 0;
    let j = 0;
    while (i < small.length && j < big.length) {
      if (small[i] === big[j]) {
        i += 1;
        j += 1;
      } else if (small[i] > big[j]) {
        j += 1;
      } else {
        return false;
      }
    }
    return i === small.length;
  };

  const accountAnagrams = accounts.map((a) => ({
    account: a,
    key: anagramKey(a.full_name),
  }));

  for (const vendor of vendors) {
    if (vendor.user_account_id != null) {
      alreadyLinked += 1;
      continue;
    }
    const ak = anagramKey(vendor.name);
    if (!ak) {
      unmatched.push({ vendorId: vendor.id, vendorName: vendor.name });
      continue;
    }

    // Strategy 1 — exact anagram.
    const exact = byAccountAnagram.get(ak);
    if (exact && exact.length === 1) {
      matched.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        userAccountId: exact[0].user_account_id,
        accountName: exact[0].full_name ?? "",
        via: "anagram-exact",
      });
      continue;
    }
    if (exact && exact.length > 1) {
      ambiguous.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        note: `${exact.length} user_account rows share this name (exact anagram)`,
      });
      continue;
    }

    // Strategy 2 — subset (vendor name is missing a middle name etc.).
    // Require a reasonably long key to avoid short-name noise.
    if (ak.length >= 9) {
      const containing = accountAnagrams.filter(
        ({ key }) => key.length > ak.length && isSubsetOf(ak, key),
      );
      if (containing.length === 1) {
        matched.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          userAccountId: containing[0].account.user_account_id,
          accountName: containing[0].account.full_name ?? "",
          via: "anagram-subset",
        });
        continue;
      }
      if (containing.length > 1) {
        ambiguous.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          note: `name is a subset of ${containing.length} user_account rows`,
        });
        continue;
      }
    }

    unmatched.push({ vendorId: vendor.id, vendorName: vendor.name });
  }

  await fs.writeFile(
    OUT_FILE,
    JSON.stringify(
      {
        diagnostics: {
          vendors: vendors.length,
          vendorNameExactMatches: {
            accountUserName: hitAccountUserName,
            accountFullName: hitAccountFullName,
            usersUsername: hitUsersUsername,
            usersName: hitUsersName,
          },
          vendorNameTokenMatches: {
            accountFullName: tokenHitAccountFullName,
            usersName: tokenHitUsersName,
          },
          vendorNameAnagramMatches: {
            accountFullName: anagramHitAccountFullName,
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
