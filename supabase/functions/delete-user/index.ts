import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 })
    }

    const token = authHeader.split(" ")[1]

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Verify user token
    const {
      data: { user },
      error: verifyError,
    } = await supabase.auth.getUser(token)

    if (verifyError || !user) return new Response("Unauthorized", { status: 401 })

    const { userId } = await req.json()

    // Only allow users to delete themselves
    if (user.id !== userId) return new Response("Forbidden", { status: 403 })

    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })

    return new Response(JSON.stringify({ message: "User deleted" }), {
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})