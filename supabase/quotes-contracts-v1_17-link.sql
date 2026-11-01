-- Contract may reference only the latest accepted quotation of the same inquiry.
alter table public.customer_contracts add column if not exists quote_version_id uuid references public.customer_quote_versions(id) on delete restrict;
create or replace function public.commercial_contract_quote_guard()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare q record;
begin
 if new.quote_id is null and new.quote_version_id is null then return new; end if;
 if new.quote_id is null or new.quote_version_id is null then raise exception 'QUOTE_VERSION_REQUIRED';end if;
 select qt.inquiry_id,qt.status,qv.quote_id,qv.version_no into q
 from public.customer_quotes qt join public.customer_quote_versions qv on qv.quote_id=qt.id
 where qt.id=new.quote_id and qv.id=new.quote_version_id;
 if not found or q.inquiry_id<>new.inquiry_id then raise exception 'QUOTE_CUSTOMER_MISMATCH';end if;
 if q.status<>'accepted' then raise exception 'QUOTE_NOT_ACCEPTED';end if;
 if exists(select 1 from public.customer_quote_versions v where v.quote_id=new.quote_id and v.version_no>q.version_no)
 then raise exception 'QUOTE_VERSION_NOT_CURRENT';end if;
 return new;
end;$$;
drop trigger if exists contract_quote_guard on public.customer_contracts;
create trigger contract_quote_guard before insert or update of quote_id,quote_version_id,inquiry_id on public.customer_contracts
for each row execute function public.commercial_contract_quote_guard();
