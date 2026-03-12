# Daily Sales – Encoder Tab Code Review and Implementation Plan

## Scope reviewed
- `src/components/daily-sales/tabs/EncoderTab.tsx`
- `src/app/api/user-account/route.ts`
- `src/lib/supabase/server.ts`
- `src/types/dailySales.ts`

## Current state (what exists today)

1. The `POF Number` input is currently initialized as an empty string (`pofNumber: ''`) in `buildInitialForm`, and there is no helper to generate a date-based prefix/value.
2. `Username` and `Member Name` are plain text fields with no lookup source and no autocomplete behavior.
3. On submit, both `username` and `name` values are simply forwarded from local form state to `/api/daily-sales/add` payload.
4. There is already a server-side Supabase admin client and an example searchable API route (`/api/user-account`) that can be used as a pattern for query + limit + sanitization.

## Gap analysis vs requested behavior

### Request A: POF field should start with date-based number (example: `031126 -`)
**Gap:** No default is computed from date, and the value does not react to date changes.

### Request B: Username should search values from `public.users`
**Gap:** No route currently targets `public.users` for encoder autocomplete, and the UI has no async search/list interaction.

### Request C: Selecting username should auto-fill Member Name
**Gap:** No entity model for username/name pairs in Encoder tab, and no selection event to set both fields atomically.

## Proposed implementation plan

### Phase 1 — Data contract and API
1. Create a dedicated route, e.g. `GET /api/daily-sales/users/search?q=<text>&limit=<n>`.
2. In the route, query `public.users` via Supabase admin client, selecting only required columns (e.g. `username`, `name`/`full_name` depending on your table schema).
3. Apply light sanitization and capped limits (reuse the same defensive approach used in `/api/user-account`).
4. Return normalized rows in a stable shape:
   - `{ username: string; memberName: string }[]`
5. Handle and surface route errors in the same style as existing API routes.

### Phase 2 — POF auto-prefix behavior
1. Add a deterministic formatter in `EncoderTab`:
   - Input: `YYYY-MM-DD`
   - Output format aligned with request example (e.g. `MMDDYY - `)
2. Use the formatter in `buildInitialForm` to set `pofNumber` default.
3. Add date-change behavior:
   - If current POF is still auto-generated (or blank), recompute when `date` changes.
   - If user already edited POF manually, do not overwrite.
4. Track a simple boolean flag like `isPofManuallyEdited` in component state.

### Phase 3 — Username autocomplete + member-name autofill
1. Add local state in `EncoderTab` for:
   - `userSearchQuery`
   - `userOptions`
   - `isUserLoading`
   - `userSearchError`
2. Add debounced fetch (250–400ms) to call the new search route while typing username.
3. Render suggestion UI (combobox/listbox or lightweight dropdown) under Username input.
4. On suggestion select:
   - set `form.username` to selected username
   - set `form.name` to selected member name
   - close suggestion list
5. Preserve manual override behavior:
   - if user types in Member Name after selection, keep that value unless a new username is selected.

### Phase 4 — UX and validation guardrails
1. Keep Username input free-text fallback for edge cases where user is not yet in `public.users`.
2. Add minimum query length (e.g. 2 chars) to reduce DB load.
3. Add empty/error states in dropdown (`No users found`, `Unable to search`).
4. Ensure keyboard accessibility (arrow keys, enter to select, escape to close).

### Phase 5 — Testing plan
1. Unit test formatter for POF:
   - `2026-03-11` → `031126 - `
   - invalid/empty date fallback behavior.
2. API route test:
   - valid query returns normalized rows
   - limit clamping works
   - DB error returns 500 payload with `success: false`
3. UI interaction test (RTL/Cypress/Playwright depending on existing setup):
   - typing username triggers search
   - selecting result fills Member Name
   - date change updates auto-generated POF only when not manually edited
4. Regression check submit payload remains compatible with `/api/daily-sales/add` contract.

## Suggested task breakdown (tickets)
1. **BE:** Add `daily-sales/users/search` route for `public.users` lookup.
2. **FE:** Add POF generator + manual-override-safe date sync.
3. **FE:** Add Username autocomplete UI and async search logic.
4. **FE:** Auto-fill Member Name from selected user.
5. **QA:** Add tests for formatter, API route, and Encoder tab interactions.

## Risks / open questions
1. Confirm exact column names in `public.users` (`username`, `name`, `full_name`, etc.).
2. Confirm whether `031126 -` means `MMDDYY -` consistently for all locales/timezones.
3. Confirm whether duplicate usernames are possible and how to disambiguate.
4. Confirm whether Member Name must always be locked to selected username or remain editable.
