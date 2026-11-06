import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const COOKIE = "rd27_edit_session";
const reply = (body: unknown, status = 200, extra: HeadersInit = {}) =>
  new Response(JSON.stringify(body), { status, headers: {
    ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store",
    "Pragma":"no-cache", ...extra
  }});
const fail = (message: string, status=400) => reply({success:false,message},status);
const hash = async (value:string) => {
  const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
};
const cookie = (token:string, maxAge:number) =>
  `${COOKIE}=${token}; Max-Age=${maxAge}; Path=/; Secure; HttpOnly; SameSite=None`;
const readCookie = (header:string|null) => {
  const item = (header || "").split(";").map(s=>s.trim()).find(s=>s.startsWith(COOKIE+"="));
  return item ? item.slice(COOKIE.length+1) : null;
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
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST") return fail("Method not allowed.",405);
  const origin=req.headers.get("origin");
  // Host-only cookie on the Supabase function origin, never a first-party website cookie.
  const allowedOrigins=(Deno.env.get("RD27_ALLOWED_ORIGINS")||"").split(",").map(s=>s.trim()).filter(Boolean);
  if(origin && allowedOrigins.length && !allowedOrigins.includes(origin)) return fail("Origin not allowed.",403);
  const url=Deno.env.get("SUPABASE_URL")!;
  const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const b=await req.json(); const action=String(b.action||"");
    if(action==="policy") {
      const {data,error}=await db.from("registration_edit_settings").select("edit_deadline").eq("singleton",true).single();
      if(error||!data) throw new Error("Edit policy is unavailable.");
      return reply({success:true,deadline:data.edit_deadline,can_edit:Date.now()<=new Date(data.edit_deadline).getTime()});
    }
    if(action==="verify") {
      const reg=String(b.registration_no||"").trim().toUpperCase();
      const name=String(b.student_name||"").trim();
      if(!/^RD27-\d+$/i.test(reg)||!name||name.length>120) return fail("Enter a valid Registration Number and Student Name.");
      const {data:setting,error:policyError}=await db.from("registration_edit_settings").select("edit_deadline").eq("singleton",true).single();
      if(policyError||!setting) throw new Error("Edit policy unavailable.");
      if(Date.now()>new Date(setting.edit_deadline).getTime()) return fail("The editing deadline has passed.",403);
      const {data:r,error}=await db.from("registrations").select("*").eq("registration_no",reg).eq("hidden_from_web",false).maybeSingle();
      if(error||!r||r.full_name.trim().toLowerCase()!==name.toLowerCase()) return fail("Registration Number and Student Name did not match.",404);
      if(r.status==="rejected") return fail("Rejected registrations must use the existing correction process.",403);
      if(r.edit_locked) return fail("Editing is individually locked.",403);
      if((r.edit_count||0)>=5) return fail("The maximum of 5 successful edits has been reached.",403);
      // Short-lived session token; only its SHA-256 hash is stored.
      const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,"0")).join("");
      const tokenHash=await hash(token);
      const {error:sessionErr}=await db.from("registration_edit_sessions").insert({
        token_hash:tokenHash,registration_id:r.id,expires_at:new Date(Date.now()+15*60_000).toISOString()
      });
      if(sessionErr) throw sessionErr;
      return reply({success:true,state:{
        registration_no:r.registration_no,edit_count:r.edit_count||0,edit_locked:!!r.edit_locked,
        edit_deadline:setting.edit_deadline,record:r
      }},200,{"Set-Cookie":cookie(token,900),"Access-Control-Allow-Credentials":"true"});
    }
    if(action==="save") {
      const raw=readCookie(req.headers.get("cookie"));
      if(!raw) return fail("Edit session expired. Verify your registration again.",401);
      const token=decodeURIComponent(raw); const tokenHash=await hash(token);
      const p=b.registration||{};
      const allowed=["full_name","class_roll","student_id","contact_mobile_number","academic_group","academic_section","student_photo","send_method","sender_mobile_no","payment_time","transaction_id","jersey_back_name","jersey_number","jersey_size"];
      if(Object.keys(p).some(k=>!allowed.includes(k))||!valid(p)) return fail("One or more submitted fields are invalid.",400);
      const {data:s,error:se}=await db.from("registration_edit_sessions").select("registration_id,expires_at").eq("token_hash",tokenHash).gt("expires_at",new Date().toISOString()).maybeSingle();
      if(se||!s) return fail("Edit session expired. Verify your registration again.",401);
      // Compare-and-swap makes parallel submissions deterministic: one can succeed, no lost writes.
      const {data:r,error:re}=await db.from("registrations").select("*").eq("id",s.registration_id).single();
      if(re||!r) return fail("Registration not found.",404);
      const {data:setting,error:pe}=await db.from("registration_edit_settings").select("edit_deadline").eq("singleton",true).single();
      if(pe||!setting) throw new Error("Edit policy unavailable.");
      if(Date.now()>new Date(setting.edit_deadline).getTime()) return fail("The editing deadline has passed.",403);
      if(r.edit_locked||r.status==="rejected"||(r.edit_count||0)>=5) return fail("This registration is no longer eligible for editing.",403);
      const update={
        full_name:p.full_name.trim(),class_roll:p.class_roll.trim(),student_id:p.student_id.trim(),
        contact_mobile_number:p.contact_mobile_number,academic_group:p.academic_group.trim(),
        academic_section:p.academic_section.trim(),student_photo:p.student_photo??r.student_photo,
        send_method:p.send_method.toLowerCase(),sender_mobile_no:p.sender_mobile_no,
        payment_time:p.payment_time.trim(),transaction_id:p.transaction_id?.trim()||null,
        jersey_back_name:p.jersey_back_name.trim(),jersey_number:p.jersey_number,jersey_size:p.jersey_size,
        edit_count:(r.edit_count||0)+1,last_edited_at:new Date().toISOString(),last_edit_source:"student",
        updated_at:new Date().toISOString()
      };
      const {data:updated,error:ue}=await db.from("registrations").update(update)
        .eq("id",r.id).eq("edit_count",r.edit_count||0).select("*").maybeSingle();
      if(ue||!updated) return fail("Registration changed in another request. Verify again before retrying.",409);
      await db.from("registration_edit_sessions").delete().eq("token_hash",tokenHash);
      return reply({success:true,record:updated},200,{"Set-Cookie":cookie("",0),"Access-Control-Allow-Credentials":"true"});
    }
    if(["lock","metadata","deadline"].includes(action)) {
      const passcode=String(b.passcode||"").trim();
      if(!passcode) return fail("Admin passcode is required.",401);
      const {data:auth,error}=await db.rpc("verify_admin_passcode",{p_passcode:passcode});
      if(error||!auth?.admin_id) return fail("Invalid admin session.",401);
      // Existing credentials are gender-specific admin roles, not Super Admin credentials.
      if(action==="deadline") return fail("Super Admin authorization is not configured. No deadline change was made.",403);
      if(auth.role!=="male_admin") return fail("Admin access required.",403);
      if(action==="lock") {
        const reg=String(b.registration_no||"").trim().toUpperCase();
        if(!/^RD27-\d+$/i.test(reg)) return fail("Invalid Registration Number.");
        const {data,error}=await db.from("registrations").update({edit_locked:!!b.locked})
          .eq("registration_no",reg).eq("hidden_from_web",false).select("registration_no,edit_locked").maybeSingle();
        if(error||!data) return fail(error?.message||"Registration not found.",404);
        return reply({success:true,record:data});
      }
      const {data,error}=await db.from("registrations").select("registration_no,edit_count,edit_locked,last_edited_at,last_edit_source")
        .eq("hidden_from_web",false).order("last_edited_at",{ascending:false,nullsFirst:false});
      if(error) throw error;
      return reply({success:true,records:data||[]});
    }
    return fail("Unsupported action.");
  } catch(e) {
    console.error("registration-edit-session",e);
    return fail("Registration edit service failed.",500);
  }
});
