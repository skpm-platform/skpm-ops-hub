import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const email = "skpmsysteminfo@gmail.com";
  const password = "SuperAdmin@2026!";

  // Create the user
  const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "System Super Admin" },
  });

  if (createError) {
    // If user exists, get them
    if (createError.message?.includes("already been registered")) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const existing = users?.find((u: any) => u.email === email);
      if (existing) {
        // Ensure admin role
        await supabaseAdmin.from("user_roles").upsert(
          { user_id: existing.id, role: "admin" },
          { onConflict: "user_id" }
        );
        return new Response(JSON.stringify({ success: true, message: "Existing user promoted to admin" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    return new Response(JSON.stringify({ error: createError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Assign admin role
  await supabaseAdmin.from("user_roles").upsert(
    { user_id: user.user.id, role: "admin" },
    { onConflict: "user_id" }
  );

  // Ensure profile exists
  await supabaseAdmin.from("profiles").upsert(
    { user_id: user.user.id, name: "System Super Admin" },
    { onConflict: "user_id" }
  );

  return new Response(JSON.stringify({ success: true, message: "Super admin created" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
