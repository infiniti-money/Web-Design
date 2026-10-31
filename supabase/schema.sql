-- ATELIER HOME v1.1 — apply in Supabase SQL Editor once a project exists.
-- Never paste a secret/service_role key into frontend code.
-- ADMIN ROLE SETUP (manually, after creating an Auth user):
-- Supabase Dashboard > Authentication > Users > select user > App Metadata.
-- Assign {"role":"admin"} in app_metadata using trusted admin tooling; never user_metadata.
-- Existing sessions must be refreshed after a role change.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) between 2 and 100),
  title text not null check (char_length(trim(title)) between 2 and 140),
  category text not null check (category in ('apartment','villa','house','commercial')),
  area text not null default '' check (char_length(area) <= 40),
  style text not null default '' check (char_length(style) <= 80),
  image_url text not null check (image_url ~ '^https://[^ ]+$'),
  summary text not null default '' check (char_length(summary) <= 2000),
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  phone text not null check (phone ~ '^[0-9+(). -]{9,18}$'),
  service text not null check (service in ('Thiết kế nội thất','Thi công trọn gói','Tư vấn & trang trí')),
  space text not null default 'Khác' check (char_length(space) <= 100),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'new' check (status in ('new','contacted','quoted','closed')),
  consented_at timestamptz,
  privacy_policy_version text,
  last_contacted_at timestamptz,
  legal_hold_until timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_public on public.projects (published, sort_order, created_at desc);
create index if not exists idx_inquiries_created on public.inquiries (created_at desc);
create index if not exists idx_inquiries_contacted_at on public.inquiries (last_contacted_at);

alter table public.projects enable row level security;
alter table public.inquiries enable row level security;

-- Explicit grants: never rely on broad defaults.
revoke all on public.projects from anon, authenticated;
revoke all on public.inquiries from anon, authenticated;
grant select on public.projects to anon;
grant select, insert, update, delete on public.projects to authenticated;
revoke insert on public.inquiries from anon;
grant select, insert, update, delete on public.inquiries to authenticated;

drop policy if exists "public can read published projects" on public.projects;
drop policy if exists "admins read projects" on public.projects;
create policy "public can read published projects"
on public.projects for select to anon, authenticated
using (
  published = true or (
    (select auth.uid()) is not null and
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
);

drop policy if exists "admins add projects" on public.projects;
create policy "admins add projects"
on public.projects for insert to authenticated
with check ( (select auth.uid()) is not null and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' );

drop policy if exists "admins edit projects" on public.projects;
create policy "admins edit projects"
on public.projects for update to authenticated
using ( (select auth.uid()) is not null and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' )
with check ( (select auth.uid()) is not null and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' );

drop policy if exists "admins remove projects" on public.projects;
create policy "admins remove projects"
on public.projects for delete to authenticated
using ( (select auth.uid()) is not null and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' );

-- All public inquiry creation MUST go through the server-side submit-inquiry Edge Function.
-- Anonymous users are not permitted to INSERT directly via Data API.
drop policy if exists "visitors send inquiries" on public.inquiries;

drop policy if exists "admins view inquiries" on public.inquiries;
create policy "admins view inquiries"
on public.inquiries for select to authenticated
using ( (select auth.uid()) is not null and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' );

drop policy if exists "admins edit inquiries" on public.inquiries;
create policy "admins edit inquiries"
on public.inquiries for update to authenticated
using ( (select auth.uid()) is not null and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' )
with check ( (select auth.uid()) is not null and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' );

drop policy if exists "admins remove inquiries" on public.inquiries;
create policy "admins remove inquiries"
on public.inquiries for delete to authenticated
using ( (select auth.uid()) is not null and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin' );

-- Demonstration projects only; replace all imagery/copy with actual portfolio.
insert into public.projects (slug,title,category,area,style,image_url,summary,published,sort_order)
values
('the-calm-residence','The Calm Residence','apartment','125 m²','Modern Minimal','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=85','Không gian nhẹ nhàng với bảng màu trung tính, ánh sáng tự nhiên và chất liệu mộc.',true,10),
('villa-elan','Villa Élan','villa','320 m²','Contemporary Luxury','https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1100&q=85','Đường nét hiện đại cùng bề mặt đá và gỗ sang trọng.',true,20),
('maison-de-lumiere','Maison de Lumière','house','180 m²','Japandi','https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1100&q=85','Vật liệu tự nhiên, khoảng thở và ánh sáng ấm.',true,30),
('the-urban-nest','The Urban Nest','apartment','95 m²','Modern Chic','https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1100&q=85','Không gian sinh hoạt gọn gàng cho nhịp sống đô thị.',true,40),
('oak-stone-house','Oak & Stone House','villa','280 m²','Warm Contemporary','https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1100&q=85','Sắc gỗ, đá và các chi tiết tinh giản cân đối.',true,50),
('the-creative-studio','The Creative Studio','commercial','150 m²','Creative Space','https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1100&q=85','Góc sáng tạo linh hoạt và cảm hứng làm việc.',true,60)
on conflict (slug) do nothing;
