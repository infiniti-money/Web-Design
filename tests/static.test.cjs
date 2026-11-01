const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const read = path => fs.readFileSync(path, "utf8");
const index = read("index.html");
const admin = read("admin.html");
const schema = read("supabase/schema.sql");

test("Public and admin pages include key functional sections", () => {
  for (const id of ["project-grid","lead-form","form-feedback","project-modal","admin-live-link"]) {
    assert.match(index, new RegExp('id="'+id+'"'));
  }
  for (const id of ["login-form","project-form","projects-table","inquiries-table","dashboard"]) {
    assert.match(admin, new RegExp('id="'+id+'"'));
  }
  assert.match(index, /<meta name="viewport"/);
  assert.match(admin, /<meta name="robots" content="noindex,nofollow">/);
  for (const id of ["lead-search","lead-filter-status","lead-filter-service","lead-filter-period",
    "lead-clear-filters","lead-match-count","crm-total","crm-today","crm-contacted","crm-quoted",
    "lead-prev-page","lead-next-page","lead-page-label","lead-export-csv"]) {
    assert.match(admin, new RegExp('id="'+id+'"'));
  }
  const adminJs=read("admin.js");
  assert.match(adminJs,/function applyInquiryQuery\(query\)/);
  assert.match(adminJs,/function loadLeadStats\(\)/);
  assert.match(adminJs,/const PAGE_SIZE = 25/);
  assert.match(adminJs,/count:"exact"/);
  assert.match(adminJs,/head:true/);
  assert.match(adminJs,/vietnamDayStartUTC/);
  assert.match(adminJs,/function exportLeadCsv\(\)/);
  assert.match(adminJs,/Neutralize CSV\/Excel formula injection/);
  for(const id of ["crm-loading","lead-profile","profile-name","profile-fields","profile-note-form",
      "profile-note-input","profile-history","profile-reminder-form","profile-reminder-at",
      "profile-reminder-save","profile-reminder-clear","lead-filter-reminder","crm-open-due","crm-due"]) {
    assert.match(admin,new RegExp('id="'+id+'"'));
  }
  const careSql=read("supabase/customer-care-v1_6.sql");
  assert.match(careSql,/on delete cascade/);
  assert.match(careSql,/enable row level security/);
  assert.match(careSql,/security invoker/);
  assert.match(careSql,/grant select, insert on table public\.inquiry_care_notes to authenticated/);
  assert.match(careSql,/author_id = \(select auth\.uid\(\)\)/);
  const auditSql=read("supabase/customer-care-audit-v1_6.sql");
  assert.match(auditSql,/security invoker/);
  assert.match(auditSql,/insert into public\.inquiry_care_notes/);
  assert.match(auditSql,/update_inquiry_status_with_log/);

  assert.match(adminJs,/client\.rpc\("schedule_inquiry_followup"/);
  assert.match(adminJs,/from\("inquiry_care_notes"\)/);
  assert.match(adminJs,/classList\.remove\("hide"\)/);
  assert.match(adminJs,/prefers-reduced-motion|loadProfileNotes/);
  for(const id of ["profile-revisions","profile-reminder-done"]){
    assert.match(admin,new RegExp('id="'+id+'"'));
  }
  assert.match(adminJs,/edit_inquiry_care_note/);
  assert.match(adminJs,/p_expected_updated_at/);
  assert.match(adminJs,/complete_inquiry_followup/);
  assert.match(adminJs,/inquiry_care_note_revisions/);
  const migrationV17=read("supabase/customer-care-edit-v1_7.sql");
  assert.match(migrationV17,/security definer set search_path=''/);
  assert.match(migrationV17,/security invoker set search_path=''/);
  assert.match(migrationV17,/STALE_NOTE/);
  assert.match(migrationV17,/previous_body,revised_body,edited_by/);
  assert.match(migrationV17,/from public,anon,authenticated/);
  assert.match(migrationV17,/on delete cascade/);
  assert.match(migrationV17,/admin view note revisions/);
  const tasksSql=read("supabase/customer-care-tasks-v1_8.sql");
  assert.match(tasksSql,/alter table public\.inquiry_care_tasks enable row level security/);
  assert.match(tasksSql,/alter table public\.inquiry_care_task_events enable row level security/);
  assert.match(tasksSql,/on delete cascade/);
  assert.match(tasksSql,/record_care_task_change/);
  assert.match(tasksSql,/revoke all on public\.inquiry_care_task_events from public,anon,authenticated/);
  const taskIds=["tab-tasks","panel-tasks","care-task-form","care-task-title",
   "care-task-assignee","care-task-priority","care-task-due","care-task-create",
   "care-task-list","care-task-events","tasks-board-table","tasks-total","tasks-todo",
   "tasks-progress","tasks-done","tasks-overdue","tasks-status-filter",
   "tasks-owner-filter","tasks-due-filter","tasks-next","tasks-prev"];
  for(const id of taskIds)assert.match(admin,new RegExp('id="'+id+'"'));
  assert.match(adminJs,/function submitCareTask\(event\)/);
  assert.match(adminJs,/function loadCustomerTasks\(\)/);
  assert.match(adminJs,/function loadTaskBoard\(\)/);
  assert.match(adminJs,/from\("inquiry_care_tasks"\)/);
  assert.match(adminJs,/from\("inquiry_care_task_events"\)/);
  for(const id of ["task-view-table","task-view-kanban","tasks-table-wrap","tasks-kanban",
    "kanban-todo","kanban-progress","kanban-done","kanban-todo-count","kanban-progress-count","kanban-done-count"]){
    assert.match(admin,new RegExp('id="'+id+'"'));
  }
  assert.match(adminJs,/function renderTaskKanban\(tasks\)/);
  assert.match(adminJs,/function setTaskView\(mode\)/);
  assert.match(adminJs,/function advanceTask\(task\)/);
  assert.match(adminJs,/aria-pressed/);
  assert.match(adminJs,/const updatingTasks=new Set\(\)/);
  const taskEditSql=read("supabase/customer-care-task-edit-v1_10.sql");
  assert.match(taskEditSql,/IMMUTABLE_TASK_IDENTITY/);
  assert.match(taskEditSql,/title_changed/);
  assert.match(taskEditSql,/details_changed/);
  assert.match(taskEditSql,/priority_changed/);
  assert.match(taskEditSql,/due_changed/);
  assert.match(admin,new RegExp('id="care-task-cancel"'));
  assert.match(adminJs,/function editCareTask\(task\)/);
  assert.match(adminJs,/function resetCareTaskEditor\(\)/);
  assert.match(adminJs,/Đã cập nhật công việc và ghi nhật ký thay đổi/);
  for(const id of ["priority-hub-title","priority-refresh","priority-status",
    "priority-task-overdue","priority-task-soon","priority-lead-overdue","priority-lead-soon",
    "priority-task-overdue-list","priority-task-soon-list","priority-lead-overdue-list",
    "priority-lead-soon-list","priority-task-overdue-open","priority-task-soon-open",
    "priority-lead-overdue-open","priority-lead-soon-open"]){
    assert.match(admin,new RegExp('id="'+id+'"'));
  }
  assert.match(adminJs,/async function loadPriorityHub\(\)/);
  assert.match(adminJs,/function showTaskPriority\(filter\)/);
  assert.match(adminJs,/function showLeadPriority\(filter\)/);
  assert.match(adminJs,/range\(0,4\)/);
  assert.match(adminJs,/count:"exact"/);
  assert.match(adminJs,/priority-refresh/);
  assert.match(adminJs,/priority-task-soon-open/);
  const reportSql=read("supabase/customer-care-performance-v1_12.sql");
  assert.match(reportSql,/security invoker set search_path=''/);
  assert.match(reportSql,/ADMIN_REQUIRED/);
  assert.match(reportSql,/INVALID_REPORT_RANGE/);
  assert.match(reportSql,/auth\.jwt\(\)/);
  assert.match(reportSql,/from public\.inquiry_care_tasks/);
  assert.match(reportSql,/generate_series/);
  assert.match(reportSql,/grant execute on function public\.care_performance_report/);
  assert.match(reportSql,/revoke all on function public\.care_performance_report/);
  for(const id of ["tab-reports","panel-reports","report-range","report-bucket",
    "report-refresh","report-status","report-total","report-done","report-rate",
    "report-in-progress","report-overdue","report-completed-in-period",
    "report-chart","report-assignee-count","report-people-table"]){
    assert.match(admin,new RegExp('id="'+id+'"'));
  }
  assert.match(adminJs,/function loadPerformanceReport\(\)/);
  assert.match(adminJs,/function renderPerformanceReport\(data\)/);
  assert.match(adminJs,/function renderReportChart\(rows,bucket\)/);
  assert.match(adminJs,/client\.rpc\("care_performance_report"/);
  for(const id of ["tab-staff","panel-staff","staff-invite-form","staff-name","staff-email",
    "staff-role","staff-table","staff-status","staff-invite-submit","tab-my-tasks",
    "panel-my-tasks","my-tasks-table","my-tasks-refresh","my-reminders","care-task-account",
    "signed-in-role","admin-overview-metrics","admin-priority-hub"]){
    assert.match(admin,new RegExp('id="'+id+'"'));
  }
  const staffSql=read("supabase/staff-roles-v1_13.sql");
  assert.match(staffSql,/staff_profiles enable row level security/);
  assert.match(staffSql,/revoke all on public\.staff_profiles from public,anon,authenticated/);
  assert.match(staffSql,/assignee_user_id uuid references auth\.users/);
  assert.match(staffSql,/staff scoped inquiry access/);
  assert.match(staffSql,/staff view assigned tasks/);
  assert.match(staffSql,/staff_task_guard/);
  assert.match(staffSql,/EMPLOYEE_STATUS_ONLY/);
  assert.match(staffSql,/account_assigned/);
  assert.match(staffSql,/on conflict\(user_id\) do nothing/);
  const edge=read("supabase/functions/staff-management/index.ts");
  assert.match(edge,/service\.auth\.getUser\(token\)/);
  assert.match(edge,/operator\.app_metadata\?\.role!=="admin"/);
  assert.match(edge,/service\.auth\.admin\.inviteUserByEmail/);
  assert.match(edge,/service\.auth\.admin\.updateUserById/);
  assert.match(edge,/CANNOT_DEMOTE_SELF/);
  assert.match(edge,/ADMIN_ROLE_PROTECTED/);
  assert.doesNotMatch(edge,/console\.log\([^\n]*serviceKey/);
  assert.match(adminJs,/async function loadMyTasks\(\)/);
  assert.match(adminJs,/async function loadStaff\(\)/);
  assert.match(adminJs,/async function callStaffApi\(payload\)/);
  assert.match(adminJs,/assignee_user_id/);
  assert.match(adminJs,/state\.currentRole/);
  const hardening=read("supabase/staff-role-hardening-v1_13_1.sql");
  const reportHardening=read("supabase/staff-report-hardening-v1_13_1.sql");
  assert.match(hardening,/private\.current_staff_role\(\)/);
  assert.match(hardening,/raw_app_meta_data->>'role'/);
  assert.match(hardening,/staff_profiles sp/);
  assert.match(hardening,/sp\.active/);
  assert.match(hardening,/EMPLOYEE_STATUS_ONLY/);
  assert.match(hardening,/grant usage on schema private to authenticated/);
  assert.match(hardening,/revoke all on function private\.current_staff_role\(\) from public,anon,authenticated/);
  assert.match(reportHardening,/coalesce\(\(select private\.current_staff_role\(\)\)/);


  assert.match(adminJs,/reportDateStart\(days\)/);



});

test("All browser scripts and inline scripts are valid JavaScript", () => {
  for (const path of ["app-config.js","site-backend.js","admin.js"]) {
    assert.doesNotThrow(() => new vm.Script(read(path), {filename:path}), path);
  }
  for (const file of ["index.html","admin.html"]) {
    let n=0;
    for(const match of read(file).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
      if(/\bsrc\s*=/.test(match[1])) continue;
      if(!match[2].trim()) continue;
      assert.doesNotThrow(()=>new vm.Script(match[2],{filename:file+" inline "+(++n)}));
    }
  }
});

test("Browser configuration uses only Supabase publishable credentials", () => {
  const ctx = { window: {} };
  vm.runInNewContext(read("app-config.js"), ctx);
  const config = ctx.window.ATELIER_CONFIG;
  assert.match(config.supabaseUrl, /^https:\/\/[a-z0-9-]+\.supabase\.co$/);
  assert.match(config.supabasePublishableKey, /^sb_publishable_[a-zA-Z0-9_-]+$/);
  assert.doesNotMatch(config.supabasePublishableKey, /sb_secret_|eyJhbGci/);
  assert.match(read("index.html"), /@supabase\/supabase-js@2\.118\.0/);
  assert.match(read("admin.html"), /@supabase\/supabase-js@2\.118\.0/);
});

test("Database tables use RLS, limited permissions, and administrator claim", () => {
  for (const table of ["projects","inquiries"]) {
    assert.match(schema, new RegExp("alter table public\\."+table+" enable row level security"));
    assert.match(schema, new RegExp("revoke all on public\\."+table+" from anon, authenticated"));
  }
  assert.match(schema, /revoke insert on public\.inquiries from anon/);
  assert.doesNotMatch(schema, /grant select on public\.inquiries to anon/i);
  assert.match(schema, /\(select auth\.jwt\(\)\)/);
  assert.doesNotMatch(schema, /auth\.jwt\(\) -> 'user_metadata'/);
});

test("Privacy notice and Turnstile integration are present and secrets stay server-side", () => {
  const policy = read("privacy.html");
  const frontend = read("site-backend.js");
  const edge = read("supabase/functions/submit-inquiry/index.ts");
  assert.match(index, /href="\.\/privacy\.html"/);
  assert.match(index, /id="turnstile-container"/);
  assert.match(policy, /Chính sách quyền riêng tư/);
  assert.match(policy, /Tân Design/);
  assert.match(policy, /Tân Phú, Việt Yên, Hưng Yên/);
  assert.match(policy, /mailto:infinitimoney@icloud\.com/);
  assert.match(index, /mailto:infinitimoney@icloud\.com/);
  assert.match(policy, /12 tháng kể từ lần liên hệ cuối cùng/);
  assert.match(policy, /xóa tự động mỗi ngày/);
  assert.match(read("supabase/inquiry-retention-12m.sql"), /atelier-inquiry-retention-12m/);
  assert.match(read("supabase/inquiry-retention-12m.sql"), /legal_hold_until/);
  assert.match(read("admin.js"), /Ghi nhận liên hệ/);
  assert.match(read("admin.js"), /client\.rpc\("record_inquiry_contact"/);
  assert.doesNotMatch(read("admin.js"), /last_contacted_at:new Date\(\)/);
  const contactSql=read("supabase/admin-contact-rpc.sql");
  assert.match(contactSql, /security invoker/i);
  assert.match(contactSql, /last_contacted_at = now\(\)/);
  assert.match(contactSql, /revoke all on function public\.record_inquiry_contact\(uuid\) from PUBLIC, anon/);
  assert.match(schema, /last_contacted_at timestamptz/);
  assert.match(read("supabase/inquiry-rate-limit.sql"), /2026-10-31-retention-12m/);
  assert.match(policy, /Singapore/);
  assert.match(frontend, /turnstile_token/);
  assert.match(frontend, /privacy_consent/);
  assert.match(edge, /privacy_consent !== true/);
  assert.match(edge, /Deno\.env\.get\("RESEND_API_KEY"\)/);
  assert.match(edge, /Deno\.env\.get\("NOTIFY_FROM_EMAIL"\)/);
  assert.match(edge, /infinitimoney@icloud\.com/);
  assert.match(edge, /api\.resend\.com\/emails/);
  assert.match(edge, /Idempotency-Key/);
  assert.match(edge, /Email này không chứa dữ liệu cá nhân khách hàng/);
  assert.match(edge, /if \(!apiKey \|\| !from\) return/);
  assert.match(schema, /consented_at timestamptz/);
  assert.match(schema, /privacy_policy_version text/);
  assert.match(read("supabase/privacy-consent.sql"), /privacy_policy_version/);
  assert.match(frontend, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/);
  assert.match(edge, /Deno\.env\.get\("TURNSTILE_SECRET_KEY"\)/);
  assert.match(edge, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
  assert.match(edge, /result\?\.hostname !== "infiniti-money\.github\.io"/);
  assert.match(edge, /result\?\.action !== "consultation"/);
  assert.doesNotMatch(read("app-config.js"), /sb_secret_[A-Za-z0-9_-]{10,}/);
});

test("Configured public site uses live API, demo fallback remains explicit", () => {
  assert.match(read("site-backend.js"), /\/functions\/v1\/submit-inquiry/);
  assert.doesNotMatch(read("site-backend.js"), /from\("inquiries"\)\.insert/);
  assert.match(read("site-backend.js"), /from\("projects"\)/);
  assert.match(index, /ATELIER_SET_PROJECTS/);
  assert.match(index, /localStorage/);
});

test("Notification trigger cannot be executed directly by clients", () => {
  const hardening=read("supabase/notifications-execute-hardening-v1_15_1.sql");
  assert.match(hardening,/revoke execute on function public\.notify_task_assignment\(\) from public, anon, authenticated/);
});
