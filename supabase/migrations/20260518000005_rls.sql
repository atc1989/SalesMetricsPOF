-- Enable RLS and grant authenticated full CRUD on the new billing tables.
-- Matches the policy pattern used for user_account in BillingSystem (supabase/user_account.sql).

-- vendors
alter table public.vendors enable row level security;

drop policy if exists "Authenticated read vendors" on public.vendors;
create policy "Authenticated read vendors"
on public.vendors for select to authenticated using (true);

drop policy if exists "Authenticated insert vendors" on public.vendors;
create policy "Authenticated insert vendors"
on public.vendors for insert to authenticated with check (true);

drop policy if exists "Authenticated update vendors" on public.vendors;
create policy "Authenticated update vendors"
on public.vendors for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated delete vendors" on public.vendors;
create policy "Authenticated delete vendors"
on public.vendors for delete to authenticated using (true);

-- bills
alter table public.bills enable row level security;

drop policy if exists "Authenticated read bills" on public.bills;
create policy "Authenticated read bills"
on public.bills for select to authenticated using (true);

drop policy if exists "Authenticated insert bills" on public.bills;
create policy "Authenticated insert bills"
on public.bills for insert to authenticated with check (true);

drop policy if exists "Authenticated update bills" on public.bills;
create policy "Authenticated update bills"
on public.bills for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated delete bills" on public.bills;
create policy "Authenticated delete bills"
on public.bills for delete to authenticated using (true);

-- bill_breakdowns
alter table public.bill_breakdowns enable row level security;

drop policy if exists "Authenticated read bill_breakdowns" on public.bill_breakdowns;
create policy "Authenticated read bill_breakdowns"
on public.bill_breakdowns for select to authenticated using (true);

drop policy if exists "Authenticated insert bill_breakdowns" on public.bill_breakdowns;
create policy "Authenticated insert bill_breakdowns"
on public.bill_breakdowns for insert to authenticated with check (true);

drop policy if exists "Authenticated update bill_breakdowns" on public.bill_breakdowns;
create policy "Authenticated update bill_breakdowns"
on public.bill_breakdowns for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated delete bill_breakdowns" on public.bill_breakdowns;
create policy "Authenticated delete bill_breakdowns"
on public.bill_breakdowns for delete to authenticated using (true);

-- bill_attachments
alter table public.bill_attachments enable row level security;

drop policy if exists "Authenticated read bill_attachments_tbl" on public.bill_attachments;
create policy "Authenticated read bill_attachments_tbl"
on public.bill_attachments for select to authenticated using (true);

drop policy if exists "Authenticated insert bill_attachments_tbl" on public.bill_attachments;
create policy "Authenticated insert bill_attachments_tbl"
on public.bill_attachments for insert to authenticated with check (true);

drop policy if exists "Authenticated update bill_attachments_tbl" on public.bill_attachments;
create policy "Authenticated update bill_attachments_tbl"
on public.bill_attachments for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated delete bill_attachments_tbl" on public.bill_attachments;
create policy "Authenticated delete bill_attachments_tbl"
on public.bill_attachments for delete to authenticated using (true);

-- pcf_transactions
alter table public.pcf_transactions enable row level security;

drop policy if exists "Authenticated read pcf" on public.pcf_transactions;
create policy "Authenticated read pcf"
on public.pcf_transactions for select to authenticated using (true);

drop policy if exists "Authenticated insert pcf" on public.pcf_transactions;
create policy "Authenticated insert pcf"
on public.pcf_transactions for insert to authenticated with check (true);

drop policy if exists "Authenticated update pcf" on public.pcf_transactions;
create policy "Authenticated update pcf"
on public.pcf_transactions for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated delete pcf" on public.pcf_transactions;
create policy "Authenticated delete pcf"
on public.pcf_transactions for delete to authenticated using (true);

-- event_requests
alter table public.event_requests enable row level security;

drop policy if exists "Authenticated read event_requests" on public.event_requests;
create policy "Authenticated read event_requests"
on public.event_requests for select to authenticated using (true);

drop policy if exists "Authenticated insert event_requests" on public.event_requests;
create policy "Authenticated insert event_requests"
on public.event_requests for insert to authenticated with check (true);

-- form_submissions
alter table public.form_submissions enable row level security;

drop policy if exists "Authenticated read form_submissions" on public.form_submissions;
create policy "Authenticated read form_submissions"
on public.form_submissions for select to authenticated using (true);

drop policy if exists "Authenticated insert form_submissions" on public.form_submissions;
create policy "Authenticated insert form_submissions"
on public.form_submissions for insert to authenticated with check (true);

drop policy if exists "Authenticated update form_submissions" on public.form_submissions;
create policy "Authenticated update form_submissions"
on public.form_submissions for update to authenticated using (true) with check (true);

-- print_logs
alter table public.print_logs enable row level security;

drop policy if exists "Authenticated read print_logs" on public.print_logs;
create policy "Authenticated read print_logs"
on public.print_logs for select to authenticated using (true);

drop policy if exists "Authenticated insert print_logs" on public.print_logs;
create policy "Authenticated insert print_logs"
on public.print_logs for insert to authenticated with check (true);
