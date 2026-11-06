import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.80.0";

const configuredOrigins = (Deno.env.get("RD27_ALLOWED_ORIGINS") || "")
  .split(",").map((value) => value.trim()).filter(Boolean);
const localOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
const allowedOriginsSet = new Set([...configuredOrigins, ...localOrigins]);

const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) return true;
  if (origin === "https://rdnic27.vercel.app") return true;
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) return true;
  if (origin.endsWith(".run.app") || origin.endsWith(".vercel.app") || origin.endsWith(".aistudio.google.com")) return true;
  return allowedOriginsSet.has(origin);
};

const corsForOrigin = (origin: string | null): HeadersInit => ({
  ...(origin && isOriginAllowed(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-edit-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const COOKIE = "rd27_edit_session";

const reply = (body: unknown, status = 200, origin: string | null = null, extra: HeadersInit = {}) =>
  new Response(JSON.stringify(body), { status, headers: {
    ...corsForOrigin(origin), "Content-Type":"application/json", "Cache-Control":"no-store",
    "Pragma":"no-cache", ...extra
  }});

const fail = (message: string, status=400, origin: string | null = null) => reply({success:false,message},status,origin);

const hash = async (value:string) => {
  const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
};

const cookie = (token:string, maxAge:number) =>
  `${COOKIE}=${token}; Max-Age=${maxAge}; Path=/; Secure; HttpOnly; SameSite=None; Partitioned`;

const readToken = (req: Request, body: any): string | null => {
  const cookieHeader = req.headers.get("cookie");
  const item = (cookieHeader || "").split(";").map(s => s.trim()).find(s => s.startsWith(COOKIE + "="));
  if (item) return item.slice(COOKIE.length + 1);
  const headerToken = req.headers.get("x-edit-token");
  if (headerToken) return headerToken.trim();
  if (body && typeof body.session_token === "string" && body.session_token.trim()) {
    return body.session_token.trim();
  }
  return null;
};

const valid = (p:any) =>
  !!p && typeof p.full_name==="string" && p.full_name.trim().length>0 && p.full_name.trim().length<=120 &&
  typeof p.class_roll==="string" && p.class_roll.trim().length>0 && p.class_roll.trim().length<=30 &&
  typeof p.student_id==="string" && p.student_id.trim().length>0 && p.student_id.trim().length<=40 &&
  /^\d{11}$/.test(String(p.contact_mobile_number||"")) &&
  typeof p.academic_group==="string" && p.academic_group.trim().length>0 &&
  typeof p.academic_section==="string" && p.academic_section.trim().length>0 &&
  ["bkash","nagad"].includes(String(p.send_method).toLowerCase()) &&
  /^\d{11}$/.test(String(p.sender_mobile_no||"")) &&
  typeof p.payment_time==="string" && p.payment_time.trim().length>0 &&
  typeof p.jersey_back_name==="string" && p.jersey_back_name.trim().length>0 && p.jersey_back_name.trim().length<=14 &&
  /^\d{1,3}$/.test(String(p.jersey_number||"")) &&
  ["S","M","L","XL","2XL","3XL","4XL"].includes(String(p.jersey_size));

Deno.serve(async (req:Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (!isOriginAllowed(origin)) return new Response("Origin not allowed.", { status: 403 });
    return new Response("ok", { headers: corsForOrigin(origin) });
  }
  if (req.method !== "POST") return fail("Method not allowed.", 405, origin);
  if (!isOriginAllowed(origin)) return fail("Origin not allowed.", 403, origin);

  const url = Deno.env.get("SUPABASE_URL")!;
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const b = await req.json();
    const action = String(b.action || "");

    if (action === "policy") {
      const { data, error } = await db.from("registration_edit_settings").select("edit_deadline, registration_open").eq("singleton", true).maybeSingle();
      if (error || !data) throw new Error("Edit policy is unavailable.");
      const isRegOpen = data.registration_open !== false;
      const isBeforeDeadline = Date.now() <= new Date(data.edit_deadline).getTime();
      return reply({
        success: true,
        deadline: data.edit_deadline,
        registration_open: isRegOpen,
        can_edit: isRegOpen && isBeforeDeadline
      }, 200, origin);
    }

    if (action === "verify") {
      const reg = String(b.registration_no || "").trim().toUpperCase();
      const name = String(b.student_name || "").trim();
      if (!/^RD27-\d+$/i.test(reg) || !name || name.length > 120) {
        return fail("Enter a valid Registration Number and Student Name.", 400, origin);
      }

      await db.from("registration_edit_sessions").delete().lt("expires_at", new Date().toISOString());

      const { data: setting, error: policyError } = await db.from("registration_edit_settings").select("edit_deadline, registration_open").eq("singleton", true).maybeSingle();
      if (policyError || !setting) throw new Error("Edit policy unavailable.");

      if (setting.registration_open === false) {
        return fail("Registration is closed. Editing is unavailable.", 403, origin);
      }
      if (Date.now() > new Date(setting.edit_deadline).getTime()) {
        return fail("The editing deadline has passed.", 403, origin);
      }

      const { data: r, error } = await db.from("registrations").select("*").eq("registration_no", reg).eq("hidden_from_web", false).maybeSingle();
      if (error || !r || r.full_name.trim().toLowerCase() !== name.toLowerCase()) {
        return fail("Registration Number and Student Name did not match.", 404, origin);
      }
      if (r.status === "rejected") {
        return fail("Rejected registrations must use the existing correction process.", 403, origin);
      }
      if (r.edit_locked) {
        return fail("Editing is individually locked.", 403, origin);
      }
      if ((r.edit_count || 0) >= 5) {
        return fail("The maximum of 5 successful edits has been reached.", 403, origin);
      }

      // Short-lived session token; only its SHA-256 hash is stored.
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n => n.toString(16).padStart(2, "0")).join("");
      const tokenHash = await hash(token);
      const { error: sessionErr } = await db.from("registration_edit_sessions").insert({
        token_hash: tokenHash,
        registration_id: r.id,
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString()
      });
      if (sessionErr) throw sessionErr;

      return reply({
        success: true,
        token,
        state: {
          registration_no: r.registration_no,
          edit_count: r.edit_count || 0,
          edit_locked: !!r.edit_locked,
          edit_deadline: setting.edit_deadline,
          record: r
        }
      }, 200, origin, { "Set-Cookie": cookie(token, 900) });
    }

    if (action === "save") {
      const token = readToken(req, b);
      if (!token) return fail("Edit session expired. Verify your registration again.", 401, origin);
      const tokenHash = await hash(token);
      const p = b.registration || {};
      const allowed = ["full_name","class_roll","student_id","contact_mobile_number","academic_group","academic_section","student_photo","send_method","sender_mobile_no","payment_time","transaction_id","jersey_back_name","jersey_number","jersey_size"];
      if (Object.keys(p).some(k => !allowed.includes(k)) || !valid(p)) {
        return fail("One or more submitted fields are invalid.", 400, origin);
      }

      const { data: atomic, error: atomicError } = await db.rpc("save_registration_edit_atomic", {
        p_token_hash: tokenHash,
        p_registration: p
      });
      if (atomicError) throw atomicError;
      if (!atomic?.success) {
        const message = String(atomic?.message || "Registration update failed.");
        const status = /deadline|locked|maximum|rejected|closed/i.test(message) ? 403 :
          /expired|session/i.test(message) ? 401 : 400;
        return fail(message, status, origin);
      }
      return reply({ success: true, record: atomic.record, edit_count: atomic.edit_count }, 200, origin, { "Set-Cookie": cookie("", 0) });
    }

    if (["lock", "metadata", "deadline", "set_registration_open"].includes(action)) {
      const passcode = String(b.passcode || "").trim();
      if (!passcode) return fail("Admin passcode is required.", 401, origin);
      const { data: auth, error } = await db.rpc("verify_admin_passcode", { p_passcode: passcode });
      if (error || !auth?.admin_id) return fail("Invalid admin session.", 401, origin);
      if (action === "deadline") return fail("Super Admin authorization is not configured. No deadline change was made.", 403, origin);
      if (auth.role !== "male_admin") return fail("Admin access required.", 403, origin);

      if (action === "set_registration_open") {
        const isOpen = Boolean(b.is_open);
        const { error: updateErr } = await db.from("registration_edit_settings").update({
          registration_open: isOpen,
          updated_at: new Date().toISOString()
        }).eq("singleton", true);
        if (updateErr) return fail(updateErr.message || "Unable to update registration open status.", 500, origin);
        return reply({ success: true, registration_open: isOpen }, 200, origin);
      }

      if (action === "lock") {
        const reg = String(b.registration_no || "").trim().toUpperCase();
        if (!/^RD27-\d+$/i.test(reg)) return fail("Invalid Registration Number.", 400, origin);
        const { data: lockedRow, error: lockError } = await db.from("registrations").update({ edit_locked: !!b.locked })
          .eq("registration_no", reg).eq("hidden_from_web", false).select("registration_no,edit_locked").maybeSingle();
        if (lockError || !lockedRow) return fail(lockError?.message || "Registration not found.", 404, origin);
        return reply({ success: true, record: lockedRow }, 200, origin);
      }

      const { data: metadataRows, error: metadataError } = await db.from("registrations").select("registration_no,edit_count,edit_locked,last_edited_at,last_edit_source")
        .eq("hidden_from_web", false).gt("edit_count", 0).order("last_edited_at", { ascending: false, nullsFirst: false });
      if (metadataError) throw metadataError;
      return reply({ success: true, records: metadataRows || [] }, 200, origin);
    }

    return fail("Unsupported action.", 400, origin);
  } catch(e) {
    console.error("registration-edit-session", e);
    return fail("Registration edit service failed.", 500, origin);
  }
});
