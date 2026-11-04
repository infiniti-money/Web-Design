-- Additive CMS for ATELIER HOME. Existing CRM, Auth users and permissions are unchanged.
create schema if not exists private;

create or replace function private.cms_staff_role()
returns text language sql stable security definer set search_path = '' as $$
  select sp.role from public.staff_profiles sp
  join auth.users u on u.id = sp.user_id
  where (select auth.uid()) is not null and sp.user_id = (select auth.uid())
    and sp.active and sp.role = u.raw_app_meta_data ->> 'role'
  limit 1;
$$;
revoke all on function private.cms_staff_role() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.cms_staff_role() to authenticated;

create table public.cms_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 100),
  title text not null check (char_length(trim(title)) between 2 and 140),
  excerpt text not null default '' check (char_length(excerpt) <= 500),
  body_markdown text not null default '' check (char_length(body_markdown) <= 100000),
  category text not null default 'Kinh nghiệm' check (char_length(category) between 2 and 80),
  cover_image_url text not null default '' check (cover_image_url = '' or cover_image_url ~ '^https://[^\s<>"'']+$'),
  image_alt text not null default '' check (char_length(image_alt) <= 250),
  image_rights_confirmed boolean not null default false,
  seo_title text not null default '' check (char_length(seo_title) <= 160),
  seo_description text not null default '' check (char_length(seo_description) <= 300),
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  author_id uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  version integer not null default 1,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cms_posts_public_idx on public.cms_posts (published_at desc) where status = 'published';
create index cms_posts_author_status_idx on public.cms_posts (author_id, status, updated_at desc);

create table public.cms_post_revisions (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.cms_posts(id) on delete cascade,
  version integer not null,
  actor_id uuid,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (post_id, version)
);

create or replace function private.cms_guard_post()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor_role text := private.cms_staff_role();
begin
  if (select auth.uid()) is null or actor_role is null or actor_role not in ('admin','manager') then
    raise exception 'CMS_ACCESS_DENIED' using errcode='42501';
  end if;
  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
    new.created_at := now();
    new.version := 1;
  else
    if new.id is distinct from old.id or new.author_id is distinct from old.author_id
      or new.created_at is distinct from old.created_at then
      raise exception 'CMS_IDENTITY_IMMUTABLE' using errcode='42501';
    end if;
    if actor_role='manager' and (old.author_id <> auth.uid() or old.status not in ('draft','review')
      or new.published_at is distinct from old.published_at) then
      raise exception 'CMS_ADMIN_REQUIRED' using errcode='42501';
    end if;
    new.version := old.version + 1;
  end if;
  if actor_role='manager' and (new.status not in ('draft','review') or new.published_at is not null) then
    raise exception 'CMS_ADMIN_REQUIRED' using errcode='42501';
  end if;
  if new.status='published' then
    if char_length(trim(new.excerpt)) < 40 or char_length(trim(new.body_markdown)) < 80 then
      raise exception 'CMS_CONTENT_INCOMPLETE' using errcode='23514';
    end if;
    if new.cover_image_url <> '' and (not new.image_rights_confirmed or char_length(trim(new.image_alt))=0) then
      raise exception 'CMS_IMAGE_RIGHTS_REQUIRED' using errcode='23514';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.cms_guard_post() from public, anon, authenticated;
create trigger cms_guard_post before insert or update on public.cms_posts
  for each row execute function private.cms_guard_post();

create or replace function private.cms_record_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.cms_post_revisions(post_id,version,actor_id,snapshot)
    values(new.id,new.version,auth.uid(),to_jsonb(new));
  return new;
end;
$$;
revoke all on function private.cms_record_revision() from public, anon, authenticated;
create trigger cms_record_revision after insert or update on public.cms_posts
  for each row execute function private.cms_record_revision();

alter table public.cms_posts enable row level security;
alter table public.cms_post_revisions enable row level security;
revoke all on public.cms_posts from anon, authenticated;
revoke all on public.cms_post_revisions from anon, authenticated;
grant select(slug,title,excerpt,body_markdown,category,cover_image_url,image_alt,seo_title,seo_description,published_at,updated_at,status)
  on public.cms_posts to anon;
grant select, insert, update on public.cms_posts to authenticated;
grant select on public.cms_post_revisions to authenticated;

create policy cms_public_read on public.cms_posts for select to anon, authenticated
  using (status='published' and published_at <= now());
create policy cms_editor_read on public.cms_posts for select to authenticated
  using ((select private.cms_staff_role())='admin'
    or ((select private.cms_staff_role())='manager' and author_id=(select auth.uid())));
create policy cms_editor_insert on public.cms_posts for insert to authenticated
  with check ((select private.cms_staff_role())='admin'
    or ((select private.cms_staff_role())='manager' and author_id=(select auth.uid()) and status in ('draft','review')));
create policy cms_editor_update on public.cms_posts for update to authenticated
  using ((select private.cms_staff_role())='admin'
    or ((select private.cms_staff_role())='manager' and author_id=(select auth.uid()) and status in ('draft','review')))
  with check ((select private.cms_staff_role())='admin'
    or ((select private.cms_staff_role())='manager' and author_id=(select auth.uid()) and status in ('draft','review')));
create policy cms_revision_read on public.cms_post_revisions for select to authenticated
  using ((select private.cms_staff_role())='admin' or ((select private.cms_staff_role())='manager' and exists (
    select 1 from public.cms_posts p where p.id=post_id and p.author_id=(select auth.uid())
  )));
