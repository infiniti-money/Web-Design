// ATELIER HOME — public consultation gateway, with DB-atomic anti-spam throttling.
// No personal data or privileged keys are logged; this function is intentionally
// public (verify_jwt=false), and performs strict input validation + rate limiting.
const SITE_ORIGINS = new Set([
  "https://infiniti-money.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);
const services = new Set(["Thiết kế nội thất", "Thi công trọn gói", "Tư vấn & trang trí"]);
const encoder = new TextEncoder();

function respond(status: number, result: Record<string, unknown>, origin: string) {
  return new Response(JSON.stringify(result), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Cache-Control": "no-store",
      "Vary": "Origin",
    },
  });
}
function valid(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}
async function fingerprint(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), {name:"HMAC",hash:"SHA-256"}, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature)).map(v => v.toString(16).padStart(2,"0")).join("");
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (!SITE_ORIGINS.has(origin)) return respond(403, {ok:false,code:"origin_denied"}, "null");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type", "Vary": "Origin" }});
  if (req.method !== "POST") return respond(405, {ok:false,code:"method_not_allowed"}, origin);
  const declaredSize = Number(req.headers.get("content-length") || 0);
  if (declaredSize > 4096) return respond(413, {ok:false,code:"payload_too_large"}, origin);
  if (!(req.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))
    return respond(415, {ok:false,code:"invalid_content_type"}, origin);

  let payload: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 4096) return respond(413,{ok:false,code:"payload_too_large"},origin);
    payload = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      return respond(400,{ok:false,code:"invalid_request"},origin);
  } catch {
    return respond(400,{ok:false,code:"invalid_json"},origin);
  }
  if (payload.website) return respond(400,{ok:false,code:"invalid_request"},origin);
  const fullName = payload.full_name;
  const phone = payload.phone;
  const service = payload.service;
  const space = payload.space ?? "Khác";
  const details = payload.details ?? "";
  if (!valid(fullName,2,100) ||
      typeof phone !== "string" || !/^[0-9+(). -]{9,18}$/.test(phone) ||
      typeof service !== "string" || !services.has(service) ||
      !valid(space,1,100) ||
      typeof details !== "string" || details.length > 1000) {
    return respond(400,{ok:false,code:"invalid_request"},origin);
  }

  // Optional Cloudflare Turnstile. Kept inactive while no Cloudflare widget exists.
  // Once TURNSTILE_SECRET_KEY is set, ALL submissions require a valid one-time token.
  // If a browser supplies a token before the server is configured, fail closed.
  const token = payload.turnstile_token;
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY") || "";
  if (turnstileSecret) {
    if (typeof token !== "string" || token.length < 5 || token.length > 2048) {
      return respond(403,{ok:false,code:"captcha_required"},origin);
    }
    try {
      const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: {"Content-Type":"application/x-www-form-urlencoded"},
        body: new URLSearchParams({ secret:turnstileSecret, response:token }),
        signal: AbortSignal.timeout(5000),
      });
      if (!verify.ok) return respond(503,{ok:false,code:"captcha_unavailable"},origin);
      const result = await verify.json();
      if (result?.success !== true ||
          result?.hostname !== "infiniti-money.github.io" ||
          result?.action !== "consultation") {
        return respond(403,{ok:false,code:"captcha_failed"},origin);
      }
    } catch {
      return respond(503,{ok:false,code:"captcha_unavailable"},origin);
    }
  } else if (token !== undefined) {
    return respond(503,{ok:false,code:"captcha_unavailable"},origin);
  }

  const apiUrl = Deno.env.get("SUPABASE_URL");
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let secretKey = "";
  try { secretKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default || ""; }
  catch { /* server misconfiguration; checked below */ }
  const secret = legacyKey || secretKey;
  if (!apiUrl || !secret) return respond(503,{ok:false,code:"temporarily_unavailable"},origin);

  // Supabase proxies provide client-IP headers; IP values are never persisted.
  // Two independent throttles: up to 3/hour per network and 5/day per phone.
  const ip = req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unavailable";
  const time = new Date().toISOString();
  const ipHash = "ip:" + await fingerprint(secret,"atelier:ip:"+time.slice(0,13)+":"+ip);
  const phoneHash = "phone:" + await fingerprint(secret,
    "atelier:phone:"+time.slice(0,10)+":"+phone.replace(/\D/g,""));
  const headers: Record<string,string> = {
    "Content-Type":"application/json",
    "Accept":"application/json",
    "apikey":secret,
  };
  if (legacyKey) headers.Authorization = "Bearer " + legacyKey;

  try {
    const response = await fetch(apiUrl + "/rest/v1/rpc/submit_inquiry_secure", {
      method:"POST", headers, signal:AbortSignal.timeout(8000),
      body:JSON.stringify({
        p_full_name:fullName.trim(), p_phone:phone.trim(), p_service:service,
        p_space:space.trim(), p_details:details.trim(),
        p_ip_key:ipHash, p_phone_key:phoneHash,
      }),
    });
    if (response.ok) return respond(201,{ok:true},origin);
    const data = await response.json().catch(()=>({}));
    if (data?.message === "RATE_LIMIT_EXCEEDED")
      return respond(429,{ok:false,code:"rate_limited"},origin);
    if (data?.message === "INVALID_REQUEST")
      return respond(400,{ok:false,code:"invalid_request"},origin);
    console.error("inquiry_rpc_error",response.status, data?.code || "unknown");
    return respond(503,{ok:false,code:"temporarily_unavailable"},origin);
  } catch (e) {
    console.error("inquiry_service_error",e instanceof Error ? e.name : "unknown");
    return respond(503,{ok:false,code:"temporarily_unavailable"},origin);
  }
});
