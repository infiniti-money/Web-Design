-- Tân Design v1.17.0 draft: versioned quotes and customer agreements.
-- Additive only. Authorization is checked in live staff_profiles + signed app_metadata.
create table if not exists public.customer_quotes (
 id uuid primary key default gen_random_uuid(),
 inquiry_id uuid not null references public.inquiries(id) on delete restrict,
 title text not null check(length(btrim(title)) between 3 and 180),
 status text not null default 'draft' check(status in ('draft','submitted','approved','rejected','sent','accepted')),
 created_by uuid not null references auth.users(id),
 approved_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.customer_quote_versions (
 id uuid primary key default gen_random_uuid(),
 quote_id uuid not null references public.customer_quotes(id) on delete restrict,
 version_no integer not null check(version_no>=1),
 content jsonb not null default '{}'::jsonb,
 total_amount numeric(16,2) not null default 0 check(total_amount>=0),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(quote_id,version_no)
);
create table if not exists public.customer_contracts (
 id uuid primary key default gen_random_uuid(),
 inquiry_id uuid not null references public.inquiries(id) on delete restrict,
 quote_id uuid references public.customer_quotes(id) on delete restrict,
 contract_number text not null unique check(length(contract_number) between 3 and 90),
 status text not null default 'draft' check(status in ('draft','review','signed','active','completed','cancelled')),
 signed_at timestamptz,
 description text not null default '',
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.customer_quotes enable row level security;
alter table public.customer_quote_versions enable row level security;
alter table public.customer_contracts enable row level security;
revoke all on public.customer_quotes, public.customer_quote_versions, public.customer_contracts from anon, authenticated;
grant select on public.customer_quotes, public.customer_quote_versions, public.customer_contracts to authenticated;
create policy quotes_staff_read on public.customer_quotes for select to authenticated using (
 exists(select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.active and s.role in ('admin','manager') and s.role=auth.jwt()->'app_metadata'->>'role')
);
create policy quote_versions_staff_read on public.customer_quote_versions for select to authenticated using (
 exists(select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.active and s.role in ('admin','manager') and s.role=auth.jwt()->'app_metadata'->>'role')
);
create policy contracts_staff_read on public.customer_contracts for select to authenticated using (
 exists(select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.active and s.role in ('admin','manager') and s.role=auth.jwt()->'app_metadata'->>'role')
);
-- Writes intentionally disabled pending approved workflow API and audit triggers.
