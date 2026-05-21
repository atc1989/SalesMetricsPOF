do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('super_admin', 'sales', 'operations');
  end if;
end$$;

create table if not exists public.app_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.app_role not null default 'sales',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_role_page_permissions (
  role public.app_role not null,
  path_prefix text not null,
  created_at timestamptz not null default now(),
  primary key (role, path_prefix)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_app_user_profiles_updated_at on public.app_user_profiles;
create trigger set_app_user_profiles_updated_at
before update on public.app_user_profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_user_profiles (user_id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), ''),
    case
      when new.raw_user_meta_data->>'role' in ('super_admin', 'sales', 'operations')
        then (new.raw_user_meta_data->>'role')::public.app_role
      else 'sales'::public.app_role
    end
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_app_profile on auth.users;
create trigger on_auth_user_created_app_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user_profile();

insert into public.app_user_profiles (user_id, email, full_name, role)
select
  id,
  coalesce(email, ''),
  nullif(coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'), ''),
  case
    when raw_user_meta_data->>'role' in ('super_admin', 'sales', 'operations')
      then (raw_user_meta_data->>'role')::public.app_role
    else 'sales'::public.app_role
  end
from auth.users
on conflict (user_id) do nothing;

insert into public.app_role_page_permissions (role, path_prefix)
values
  ('super_admin', '/'),
  ('sales', '/'),
  ('sales', '/sales'),
  ('sales', '/daily-sales'),
  ('sales', '/encoder'),
  ('sales', '/inventory-movement'),
  ('operations', '/bills'),
  ('operations', '/pcf'),
  ('operations', '/event-forms'),
  ('operations', '/forms')
on conflict do nothing;

alter table public.app_user_profiles enable row level security;
alter table public.app_role_page_permissions enable row level security;

drop policy if exists "Users can read own app profile" on public.app_user_profiles;
create policy "Users can read own app profile"
on public.app_user_profiles for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read role page permissions" on public.app_role_page_permissions;
create policy "Authenticated users can read role page permissions"
on public.app_role_page_permissions for select
to authenticated
using (true);
