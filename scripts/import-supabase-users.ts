import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

dotenv.config({ path: path.resolve(process.cwd(), ".env.import") });

const SOURCE_FILE_PATH = path.resolve(
  process.cwd(),
  "data",
  "GRINDERS GUILD (59).xlsx",
);
const ERROR_FILE_PATH = path.resolve(process.cwd(), "import-users-errors.json");
const DRY_RUN = process.env.IMPORT_DRY_RUN === "true";
const BATCH_SIZE = Number(process.env.IMPORT_BATCH_SIZE ?? "20");
const START_ROW_INDEX = Number(process.env.IMPORT_START_ROW_INDEX ?? "0");

type LegacyRow = {
  "ID#"?: unknown;
  REGISTERED?: unknown;
  NAME?: unknown;
  USERNAME?: unknown;
  PASSWORD?: unknown;
  ENDING_BALANCE?: unknown;
  SPONSORED?: unknown;
  ACCOUNT_TYPE?: unknown;
};

type UsersInsertRow = {
  name: string;
  username: string;
  zero_one: string | null;
  zero_one_avatar: string | null;
  code_payment: string | null;
};

type ImportErrorRecord = {
  rowNumber: number;
  nameRaw: string;
  usernameRaw: string;
  rowStatus:
    | "insert_failed"
    | "skipped_duplicate"
    | "skipped_missing_name"
    | "skipped_missing_username";
  reason: string;
  details?: unknown;
};

type Counters = {
  processedRows: number;
  insertedRows: number;
  skippedDuplicates: number;
  skippedMissingName: number;
  skippedMissingUsername: number;
  errors: number;
};

function valueToString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeName(value: unknown): string {
  return valueToString(value) ?? "";
}

function normalizeUsername(value: unknown): string {
  return valueToString(value) ?? "";
}

function printProgress(counters: Counters) {
  console.log("----- Import Progress -----");
  console.log(`Processed rows: ${counters.processedRows}`);
  console.log(`Inserted rows: ${counters.insertedRows}`);
  console.log(`Skipped duplicates: ${counters.skippedDuplicates}`);
  console.log(`Skipped missing name: ${counters.skippedMissingName}`);
  console.log(`Skipped missing username: ${counters.skippedMissingUsername}`);
  console.log(`Errors: ${counters.errors}`);
  console.log("---------------------------");
}

function resolveBatchSize() {
  if (!Number.isFinite(BATCH_SIZE) || BATCH_SIZE <= 0) {
    return 20;
  }

  return Math.floor(BATCH_SIZE);
}

function resolveStartRowIndex() {
  if (!Number.isFinite(START_ROW_INDEX) || START_ROW_INDEX < 0) {
    return 0;
  }

  return Math.floor(START_ROW_INDEX);
}

async function main() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.import",
    );
  }

  if (!fs.existsSync(SOURCE_FILE_PATH)) {
    throw new Error(`Source file not found: ${SOURCE_FILE_PATH}`);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const fileBuffer = fs.readFileSync(SOURCE_FILE_PATH);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("No worksheet found in the Excel file.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<(string | null)[]>(worksheet, {
    header: 1,
    defval: null,
    raw: false,
  });

  const headerRow = rawRows[0];
  if (!headerRow) {
    throw new Error("Worksheet does not contain a header row.");
  }

  const rows = rawRows.slice(2).map((columns) => ({
    "ID#": columns[0],
    REGISTERED: columns[1],
    NAME: columns[2],
    USERNAME: columns[3],
    PASSWORD: columns[4],
    ENDING_BALANCE: columns[5],
    SPONSORED: columns[6],
    ACCOUNT_TYPE: columns[7],
  })) as LegacyRow[];

  const startIndex = resolveStartRowIndex();
  const batchSize = resolveBatchSize();
  const endIndex = Math.min(rows.length, startIndex + batchSize);

  const counters: Counters = {
    processedRows: 0,
    insertedRows: 0,
    skippedDuplicates: 0,
    skippedMissingName: 0,
    skippedMissingUsername: 0,
    errors: 0,
  };
  const errors: ImportErrorRecord[] = [];

  for (let index = startIndex; index < endIndex; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;
    counters.processedRows += 1;

    const name = normalizeName(row.NAME);
    const username = normalizeUsername(row.USERNAME);

    if (!name) {
      counters.skippedMissingName += 1;
      errors.push({
        rowNumber,
        nameRaw: valueToString(row.NAME) ?? "",
        usernameRaw: valueToString(row.USERNAME) ?? "",
        rowStatus: "skipped_missing_name",
        reason: "Missing NAME value.",
      });
      continue;
    }

    if (!username) {
      counters.skippedMissingUsername += 1;
      errors.push({
        rowNumber,
        nameRaw: name,
        usernameRaw: valueToString(row.USERNAME) ?? "",
        rowStatus: "skipped_missing_username",
        reason: "Missing USERNAME value.",
      });
      continue;
    }

    const existingQuery = supabase
      .from("users")
      .select("user_id,name,username")
      .eq("username", username)
      .limit(1);

    const { data: existingRow, error: existingError } = await existingQuery;

    if (existingError) {
      counters.errors += 1;
      errors.push({
        rowNumber,
        nameRaw: name,
        usernameRaw: username,
        rowStatus: "insert_failed",
        reason: "Failed to check existing users row.",
        details: existingError.message,
      });
      continue;
    }

    const duplicateFound = (existingRow ?? []).length > 0;

    if (duplicateFound) {
      counters.skippedDuplicates += 1;
      errors.push({
        rowNumber,
        nameRaw: name,
        usernameRaw: username,
        rowStatus: "skipped_duplicate",
        reason: "Matching username already exists in public.users.",
      });
      continue;
    }

    const payload: UsersInsertRow = {
      name,
      username,
      zero_one: null,
      zero_one_avatar: null,
      code_payment: null,
    };

    if (DRY_RUN) {
      counters.insertedRows += 1;
      console.log(`[DRY_RUN] row ${rowNumber}: would insert`, payload);
      continue;
    }

    const { error: insertError } = await supabase.from("users").insert(payload);

    if (insertError) {
      counters.errors += 1;
      errors.push({
        rowNumber,
        nameRaw: name,
        usernameRaw: username,
        rowStatus: "insert_failed",
        reason: "Insert into public.users failed.",
        details: insertError.message,
      });
      continue;
    }

    counters.insertedRows += 1;
  }

  fs.writeFileSync(ERROR_FILE_PATH, JSON.stringify(errors, null, 2), "utf8");

  console.log("\nImport finished.");
  printProgress(counters);
  console.log("----- Final Summary -----");
  console.log(`Source file: ${SOURCE_FILE_PATH}`);
  console.log(`Start row index: ${startIndex}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Inserted rows: ${counters.insertedRows}`);
  console.log(
    `Rows skipped: ${counters.skippedDuplicates + counters.skippedMissingName + counters.skippedMissingUsername}`,
  );
  console.log(`Rows failed: ${counters.errors}`);
  console.log("-------------------------");
  console.log(`Error log written to: ${ERROR_FILE_PATH}`);
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exitCode = 1;
});
