// Supabase Edge Function: bulk-create-users
// Creates Auth users (email_confirmed, no invite) and upserts into public.users
// Request body: { users: Array<{ email: string, name?: string, role?: 'mentor'|'mentee' }> }
// Response: { created: any[], existing: any[], errors: string[], map: Record<string, { id: string, email: string, name: string }> }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function randomPassword(len = 16) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  // hex string
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { users } = await req.json().catch(() => ({ users: [] }));
  if (!Array.isArray(users)) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Missing service configuration" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${SERVICE_ROLE}` } },
  });

  const uniq = new Map<string, { email: string; name?: string; role?: string }>();
  for (const u of users) {
    const email = String(u?.email || "").trim().toLowerCase();
    if (!email) continue;
    if (!uniq.has(email)) uniq.set(email, { email, name: u?.name, role: u?.role });
  }

  const out = {
    created: [] as any[],
    existing: [] as any[],
    errors: [] as string[],
    map: {} as Record<string, { id: string; email: string; name: string }>,
  };

  for (const { email, name, role } of uniq.values()) {
    let authUser: any = null;

    // Try to create Auth user (email confirmed, no invitation)
    const createRes = await admin.auth.admin.createUser({
      email,
      password: randomPassword(),
      email_confirm: true,
      user_metadata: { role, name },
    });

    if (createRes.error) {
      // If already exists, fetch via Admin REST (search by email)
      const msg = createRes.error.message?.toLowerCase() || "";
      if (msg.includes("already registered") || msg.includes("user already exists") || createRes.error.status === 422 || createRes.error.status === 409) {
        const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
          headers: {
            apikey: SERVICE_ROLE,
            Authorization: `Bearer ${SERVICE_ROLE}`,
            "Content-Type": "application/json",
          },
        });
        if (!resp.ok) {
          out.errors.push(`Failed to fetch existing auth user for ${email}: ${resp.status}`);
          continue;
        }
        const arr = await resp.json();
        authUser = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
        if (!authUser) {
          out.errors.push(`Existing auth user not found after conflict for ${email}`);
          continue;
        }
        out.existing.push({ id: authUser.id, email: authUser.email });
      } else {
        out.errors.push(`createUser failed for ${email}: ${createRes.error.message}`);
        continue;
      }
    } else {
      authUser = createRes.data.user;
      out.created.push({ id: authUser.id, email: authUser.email });
    }

    // Upsert public.users profile
    const profile = {
      id: authUser.id,
      email,
      name: name || authUser.user_metadata?.name || email.split("@")[0],
      // role may not exist in schema; do not set it to avoid schema errors
    } as any;

    const upsert = await admin.from("users").upsert(profile).select("id, name, email").single();
    if (upsert.error) {
      out.errors.push(`users upsert failed for ${email}: ${upsert.error.message}`);
      // Continue anyway
      out.map[email] = { id: authUser.id, email, name: profile.name };
    } else {
      out.map[email] = upsert.data as { id: string; email: string; name: string };
    }
  }

  return new Response(JSON.stringify(out), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
