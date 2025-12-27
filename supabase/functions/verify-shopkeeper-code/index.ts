import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  userId: string;
  code: string;
}

// In-memory rate limiter (resets on function cold start, but provides basic protection)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimits.get(identifier);

  if (!record || record.resetAt < now) {
    rateLimits.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxAttempts) return false;

  record.count++;
  return true;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, code }: VerifyRequest = await req.json();

    console.log(`Verifying code for user: ${userId}`);

    if (!userId || !code) {
      return new Response(JSON.stringify({ error: "Missing userId or code", valid: false }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Rate limit: 5 verification attempts per 10 minutes per userId
    if (!checkRateLimit(userId, 5, 10 * 60 * 1000)) {
      console.log(`Rate limit exceeded for user: ${userId}`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Too many verification attempts. Please request a new code after 10 minutes." 
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the code
    const { data: codeData, error: fetchError } = await supabase
      .from("shopkeeper_verification_codes")
      .select("*")
      .eq("user_id", userId)
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !codeData) {
      console.log("Invalid or expired code:", fetchError);
      return new Response(JSON.stringify({ valid: false, error: "Invalid or expired code" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Mark code as used
    await supabase
      .from("shopkeeper_verification_codes")
      .update({ used: true })
      .eq("id", codeData.id);

    console.log("Code verified successfully for user:", userId);

    return new Response(JSON.stringify({ valid: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in verify-shopkeeper-code function:", error);
    return new Response(
      JSON.stringify({ error: error.message, valid: false }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
