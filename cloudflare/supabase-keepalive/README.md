# ATELIER HOME – Supabase keepalive (Cloudflare Worker)

This Worker makes a **read-only** GET request to the existing
`atelier-home-web-design` Supabase project's **published** portfolio rows.
No customer/private tables are queried, no database records are written, and
no privileged API keys are required.

- Supabase project ID: `mswiegltusllzvuavjdh` (Singapore).
- Worker: `atelier-home-supabase-keepalive` (no public HTTP endpoint).
- Cron: `17 */6 * * *` (UTC), or **01:17, 07:17, 13:17, 19:17** (Asia/Bangkok).
- Approximate executions: 4/day, ~120 per 30 days.
- License: uses Cloudflare Workers Free quotas; verify account limits.
- Observability: Cloudflare dashboard Worker logs.
- Important: Supabase Free inactivity thresholds are not guaranteed. Even a
  regular, successful read may not prevent a project from being paused.

## Deploy the Worker once in your Cloudflare account

Requirements: Node.js installed, Git checkout available, Cloudflare account
access with Workers permissions. From the **repository root**:

```powershell
cd cloudflare/supabase-keepalive
npx wrangler login
npx wrangler deploy
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
```

For the last command, paste the **publishable** key already used by
`app-config.js` (the string beginning with `sb_publishable_`) into the
interactive terminal prompt. Do **not** paste a service-role key, secret key,
user token, customer credentials, or database password. Do **not** commit the
key to another file. Supabase URL is already pinned in `wrangler.toml`.

If the secret is changed, repeat `npx wrangler secret put SUPABASE_PUBLISHABLE_KEY`.
Then verify in Cloudflare Dashboard → Workers & Pages →
`atelier-home-supabase-keepalive` → Settings → Triggers that the Cron Trigger
is listed, and use Observability / Logs to verify **HTTP 200** for the next
scheduled execution. Wrangler-managed schedules should be edited only via
`wrangler.toml` and `wrangler deploy`, not mixed with dashboard edits.

To test the local logic without any network or credential access, run from
the repository root:

```powershell
node --test tests/cloudflare-keepalive.test.cjs
```

Optional real local cron test: in this Worker folder, create an ignored
`.dev.vars` file containing
`SUPABASE_PUBLISHABLE_KEY="your-browser-publishable-key"`. Run
`npx wrangler dev --test-scheduled`, and then request
`http://127.0.0.1:8787/cdn-cgi/handler/scheduled` locally.
Never commit `.dev.vars` or share its contents.

## Cutover from GitHub Actions

**Do not disable the currently active GitHub keepalive before Cloudflare
is deployed and at least one real Cloudflare scheduled execution has
completed successfully.** Doing so creates an unnecessary interruption.

After a successful production Cron Trigger run, delete the old
`.github/workflows/supabase-keepalive.yml` file (or remove its
`schedule:` trigger) from the repository. GitHub Actions can still be used
for normal CI and release workflows; they will no longer control Supabase
keepalive. Keep Cloudflare Observability enabled and periodically verify
successful runs. A Cron Trigger is not a guarantee against Free-tier pausing.

Supabase documentation:
https://supabase.com/docs/guides/platform/free-project-pausing

Cloudflare Cron Triggers:
https://developers.cloudflare.com/workers/configuration/cron-triggers/
