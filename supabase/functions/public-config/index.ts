// Public config endpoint for the frontend.
// Exposes only non-sensitive values (publishable keys).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const clerkPublishableKey = Deno.env.get("VITE_CLERK_PUBLISHABLE_KEY") ?? "";

  return new Response(JSON.stringify({ clerkPublishableKey }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
