-- Keep staff/Auth tables private. Public catalog reads must not evaluate staff subqueries.
drop policy catalog_public_read on public.catalog_items;
create policy catalog_anon_read on public.catalog_items for select to anon using (published);
create policy catalog_authenticated_read on public.catalog_items for select to authenticated
 using (published or (select private.current_staff_role())='admin');
-- Keep existing Admin-only mutations, using current authoritative role rather than stale JWT/profile pairs.
drop policy catalog_admin_insert on public.catalog_items;
create policy catalog_admin_insert on public.catalog_items for insert to authenticated
 with check ((select private.current_staff_role())='admin');
drop policy catalog_admin_update on public.catalog_items;
create policy catalog_admin_update on public.catalog_items for update to authenticated
 using ((select private.current_staff_role())='admin') with check ((select private.current_staff_role())='admin');
drop policy catalog_admin_delete on public.catalog_items;
create policy catalog_admin_delete on public.catalog_items for delete to authenticated
 using ((select private.current_staff_role())='admin');
