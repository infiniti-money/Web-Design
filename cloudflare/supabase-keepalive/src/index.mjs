/**
 * ATELIER HOME Supabase inactivity-prevention check.
 * Cron-only: no HTTP route, no data writes, no service-role credentials.
 * A successful read is evidence of database activity, not a guarantee
 * against Supabase Free-tier automatic pausing.
 */
const EXPECTED_SUPABASE_URL = "https://mswiegltusllzvuavjdh.supabase.co";

export async function pingSupabase(env, fetchImpl = fetch) {
  // Guard against inadvertently pinging other users' Supabase projects.
  if (env?.SUPABASE_URL !== EXPECTED_SUPABASE_URL) {
    throw new Error("Unexpected Supabase project URL");
  }

  const publishableKey = env?.SUPABASE_PUBLISHABLE_KEY;
  if (
    typeof publishableKey !== "string" ||
    !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)
  ) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY is not configured");
  }

  const url =
    EXPECTED_SUPABASE_URL +
    "/rest/v1/projects?select=slug&published=eq.true&limit=1";
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      apikey: publishableKey,
      Accept: "application/json",
      "Cache-Control": "no-store",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (response.status !== 200) {
    throw new Error("Supabase REST read failed: HTTP " + response.status);
  }
  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error("Supabase REST response was not a JSON array");
  }

  // Never print credentials, URLs with tokens, customer data or row contents.
  console.info(
    "[atelier-home-keepalive] Supabase SELECT OK, HTTP 200, rows=" + rows.length,
  );
  return rows.length;
}

export default {
  async scheduled(_controller, env, _ctx) {
    await pingSupabase(env);
  },
};
