-- ATELIER HOME / Tân Design v1.12: truthful, RLS-scoped performance reports.
-- Reporting cohort is assigned tasks CREATED in [p_start, p_end).
-- Done rate is the CURRENT status of that cohort, not a historical status snapshot.
-- Person is the CURRENT assignee_name, not a separately authenticated employee identity.
create or replace function public.care_performance_report(
  p_start timestamptz, p_end timestamptz, p_bucket text default 'week'
) returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare
  v_overview jsonb;
  v_people jsonb;
  v_trend jsonb;
  v_completed_in_period integer;
begin
  if (select auth.uid()) is null
     or coalesce((select auth.jwt())->'app_metadata'->>'role','') not in ('admin','manager')
  then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  if p_start is null or p_end is null or p_end<=p_start or p_end>now()+interval '1 day'
     or p_end-p_start>interval '366 days'
     or p_bucket not in ('week','month')
  then raise exception 'INVALID_REPORT_RANGE' using errcode='22023'; end if;

  -- Workload: assignment creation cohort, current statuses and overdue as of query time.
  select pg_catalog.jsonb_build_object(
    'total',count(*)::integer,
    'todo',count(*) filter(where t.status='todo')::integer,
    'in_progress',count(*) filter(where t.status='in_progress')::integer,
    'done',count(*) filter(where t.status='done')::integer,
    'overdue',count(*) filter(where t.status<>'done' and t.due_at<now())::integer,
    'completion_rate',coalesce(pg_catalog.round(
       100.0 * count(*) filter(where t.status='done') / nullif(count(*),0),1),0)
  ) into v_overview
  from public.inquiry_care_tasks t where t.created_at>=p_start and t.created_at<p_end;

  -- Independently count actual completions in period, including earlier-created tasks.
  select count(*)::integer into v_completed_in_period from public.inquiry_care_tasks t
    where t.completed_at>=p_start and t.completed_at<p_end;

  -- Aggregate the current assignee's created-task cohort, without exposing customer details.
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'assignee',s.assignee_name,
    'total',s.total,'todo',s.todo,'in_progress',s.in_progress,
    'done',s.done,'overdue',s.overdue,'completion_rate',s.completion_rate
  ) order by s.total desc,s.assignee_name),'[]'::jsonb) into v_people
  from (
    select t.assignee_name,
      count(*)::integer as total,
      count(*) filter(where status='todo')::integer as todo,
      count(*) filter(where status='in_progress')::integer as in_progress,
      count(*) filter(where status='done')::integer as done,
      count(*) filter(where status<>'done' and due_at<now())::integer as overdue,
      coalesce(pg_catalog.round(100.0*count(*) filter(where status='done')/
        nullif(count(*),0),1),0) as completion_rate
    from public.inquiry_care_tasks t
    where t.created_at>=p_start and t.created_at<p_end
    group by t.assignee_name
  ) s;

  -- Include zero-activity weeks/months so the chart is not misleading.
  with dates as (
    select pg_catalog.generate_series(
      pg_catalog.date_trunc(p_bucket,p_start at time zone 'Asia/Ho_Chi_Minh'),
      pg_catalog.date_trunc(p_bucket,(p_end-interval '1 microsecond') at time zone 'Asia/Ho_Chi_Minh'),
      case when p_bucket='week' then interval '1 week' else interval '1 month' end
    ) as bucket_time
  ),
  counts as (
    select pg_catalog.date_trunc(p_bucket,t.created_at at time zone 'Asia/Ho_Chi_Minh') as bucket_time,
      count(*)::integer as total,
      count(*) filter(where status='done')::integer as done
    from public.inquiry_care_tasks t where t.created_at>=p_start and t.created_at<p_end
    group by 1
  )
  select coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'period',pg_catalog.to_char(d.bucket_time,'YYYY-MM-DD'),
      'total',coalesce(c.total,0),'done',coalesce(c.done,0)
    ) order by d.bucket_time),'[]'::jsonb) into v_trend
  from dates d left join counts c using(bucket_time);

  return pg_catalog.jsonb_build_object(
    'overview',v_overview,'people',v_people,'trend',v_trend,
    'completed_in_period',v_completed_in_period,
    'bucket',p_bucket,'range_start',p_start,'range_end',p_end
  );
end;$$;
revoke all on function public.care_performance_report(timestamptz,timestamptz,text)
 from public,anon,authenticated;
grant execute on function public.care_performance_report(timestamptz,timestamptz,text)
 to authenticated;
