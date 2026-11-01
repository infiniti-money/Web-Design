-- Tân Design catalog v1; does not change Auth, staff_profiles or existing projects.
create table if not exists public.catalog_items (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(trim(name)) between 2 and 140),
 category text not null check (category in ('Mẫu nội thất','Vật liệu','Thiết bị')),
 style text not null default '' check (char_length(style)<=80),
 description text not null default '' check (char_length(description)<=2000),
 image_url text not null default '' check (image_url='' or image_url ~ '^https://[^ ]+$'),
 published boolean not null default false,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists catalog_public_idx on public.catalog_items(published,sort_order);
alter table public.catalog_items enable row level security;
revoke all on public.catalog_items from anon,authenticated;
grant select on public.catalog_items to anon,authenticated;
grant insert,update,delete on public.catalog_items to authenticated;
create policy "catalog_public_read" on public.catalog_items for select to anon, authenticated using (
 published or (auth.uid() is not null and exists (
  select 1 from public.staff_profiles sp where sp.user_id=auth.uid() and sp.active=true and sp.role='admin'
 ) and auth.jwt()->'app_metadata'->>'role'='admin')
);
create policy "catalog_admin_insert" on public.catalog_items for insert to authenticated with check (
 exists(select 1 from public.staff_profiles sp where sp.user_id=auth.uid() and sp.active=true and sp.role='admin')
 and auth.jwt()->'app_metadata'->>'role'='admin'
);
create policy "catalog_admin_update" on public.catalog_items for update to authenticated using (
 exists(select 1 from public.staff_profiles sp where sp.user_id=auth.uid() and sp.active=true and sp.role='admin')
 and auth.jwt()->'app_metadata'->>'role'='admin'
) with check (
 exists(select 1 from public.staff_profiles sp where sp.user_id=auth.uid() and sp.active=true and sp.role='admin')
 and auth.jwt()->'app_metadata'->>'role'='admin'
);
create policy "catalog_admin_delete" on public.catalog_items for delete to authenticated using (
 exists(select 1 from public.staff_profiles sp where sp.user_id=auth.uid() and sp.active=true and sp.role='admin')
 and auth.jwt()->'app_metadata'->>'role'='admin'
);