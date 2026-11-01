-- v1.15.1 security hardening, no data rewrite.
-- This is a trigger function, not a public browser RPC. The database trigger
-- invokes it internally when a task is assigned; external roles need no EXECUTE.
revoke execute on function public.notify_task_assignment() from public, anon, authenticated;
