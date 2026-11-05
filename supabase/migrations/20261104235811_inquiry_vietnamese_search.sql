-- Fixed Vietnamese alphabet folding; no mutable extension dictionary.
create or replace function private.fold_vietnamese(value text)
returns text language sql immutable parallel safe set search_path='' as $$
 select translate(translate(lower(coalesce(value,'')), 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'),
 U&'\0300\0301\0303\0309\0323\0302\0306\031B', '');
$$;
revoke all on function private.fold_vietnamese(text) from public,anon;
grant execute on function private.fold_vietnamese(text) to authenticated,service_role;
alter table public.inquiries add column search_text text generated always as
 (private.fold_vietnamese(coalesce(full_name,'')||' '||coalesce(phone,'')||' '||coalesce(details,'')||' '||coalesce(service,'')||' '||coalesce(space,''))) stored;
comment on column public.inquiries.search_text is 'Generated Vietnamese search text. Contains private CRM data; subject to existing inquiries RLS.';
