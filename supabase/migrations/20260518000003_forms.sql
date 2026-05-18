-- Event forms: event_requests, form_submissions, print_logs
-- Ports schema from src/services/eventRequests.service.ts and src/services/formPrintTracking.service.ts.

create table if not exists public.event_requests (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  submitted_at timestamptz not null default now()
);

create index if not exists event_requests_submitted_at_idx on public.event_requests (submitted_at desc);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null check (form_type in ('ER', 'SC', 'PI')),
  reference_no text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (form_type, reference_no)
);

create index if not exists form_submissions_form_type_idx on public.form_submissions (form_type);
create index if not exists form_submissions_created_at_idx on public.form_submissions (created_at desc);

create table if not exists public.print_logs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  form_type text not null check (form_type in ('ER', 'SC', 'PI')),
  reference_no text not null,
  printed_at timestamptz not null default now()
);

create index if not exists print_logs_submission_id_idx on public.print_logs (submission_id);
create index if not exists print_logs_printed_at_idx on public.print_logs (printed_at desc);

create or replace function public.set_form_submissions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_form_submissions_updated_at on public.form_submissions;
create trigger trg_form_submissions_updated_at
  before update on public.form_submissions
  for each row execute function public.set_form_submissions_updated_at();

-- Reference-number generator for forms: {ER|SC|PI}-YYYYMM-####.
-- Adjust the format if your historical BillingSystem prefix differs.
create or replace function public.get_next_reference_no(form_type text)
returns text language plpgsql as $$
declare
  v_prefix text;
  v_count integer;
  v_ref text;
begin
  if form_type not in ('ER', 'SC', 'PI') then
    raise exception 'Unknown form_type: %', form_type;
  end if;

  v_prefix := form_type || '-' || to_char(current_date, 'YYYYMM') || '-';

  select count(*) + 1
    into v_count
    from public.form_submissions
    where form_submissions.form_type = get_next_reference_no.form_type
      and reference_no like v_prefix || '%';

  v_ref := v_prefix || lpad(v_count::text, 4, '0');

  while exists (
    select 1 from public.form_submissions
    where form_submissions.form_type = get_next_reference_no.form_type
      and reference_no = v_ref
  ) loop
    v_count := v_count + 1;
    v_ref := v_prefix || lpad(v_count::text, 4, '0');
  end loop;

  return v_ref;
end;
$$;
