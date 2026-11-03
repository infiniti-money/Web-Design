const { test } = require("node:test");
const assert = require("node:assert/strict");

const URL = "https://mswiegltusllzvuavjdh.supabase.co";
const KEY = "sb_publishable_test_key";
const environment = Object.freeze({
  SUPABASE_URL: URL,
  SUPABASE_PUBLISHABLE_KEY: KEY,
});
const workerPromise = import("../cloudflare/supabase-keepalive/src/index.mjs");

test("Cloudflare scheduled handler reads only published Supabase project rows", async () => {
  const { pingSupabase } = await workerPromise;
  let requests = 0;
  const rows = await pingSupabase(environment, async (url, opts) => {
    requests += 1;
    assert.equal(url, URL + "/rest/v1/projects?select=slug&published=eq.true&limit=1");
    assert.equal(opts.method, "GET");
    assert.equal(opts.headers.apikey, KEY);
    assert.equal(opts.headers["Cache-Control"], "no-store");
    return { status: 200, json: async () => [{ slug: "demo" }] };
  });
  assert.equal(rows, 1);
  assert.equal(requests, 1);
});

test("Cloudflare keepalive rejects missing or wrongly scoped credentials", async () => {
  const { pingSupabase } = await workerPromise;
  let requests = 0;
  const shouldNotFetch = async () => { requests += 1; };
  await assert.rejects(pingSupabase({
    SUPABASE_URL: "https://lxarzbxymgjomsztftqj.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: KEY,
  }, shouldNotFetch), /Unexpected Supabase project URL/);
  await assert.rejects(pingSupabase({
    SUPABASE_URL: URL,
    SUPABASE_PUBLISHABLE_KEY: "sb_secret_do_not_use",
  }, shouldNotFetch), /not configured/);
  assert.equal(requests, 0);
});

test("Cloudflare keepalive propagates HTTP failures to Worker logs", async () => {
  const { pingSupabase } = await workerPromise;
  await assert.rejects(
    pingSupabase(environment, async () => ({ status: 401 })),
    /HTTP 401/,
  );
});

test("Cloudflare keepalive checks the returned database payload", async () => {
  const { pingSupabase } = await workerPromise;
  await assert.rejects(
    pingSupabase(environment, async () => ({
      status: 200, json: async () => ({ error: "unexpected" }),
    })),
    /not a JSON array/,
  );
});

test("Cron configuration keeps schedule outside of GitHub Actions", async () => {
  const fs = require("node:fs");
  const conf = fs.readFileSync(
    "cloudflare/supabase-keepalive/wrangler.toml", "utf8",
  );
  assert.match(conf, /workers_dev\s*=\s*false/);
  assert.match(conf, /crons\s*=\s*\["17 \*\/6 \* \* \*"\]/);
});
