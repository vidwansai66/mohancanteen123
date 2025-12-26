import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = "saividwan.06@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  userId: string;
  userEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, userEmail }: VerificationRequest = await req.json();
    
    console.log(`Processing verification request for user: ${userId}, email: ${userEmail}`);

    if (!userId || !userEmail) {
      return new Response(JSON.stringify({ error: "Missing userId or userEmail" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: dbError } = await supabase
      .from("shopkeeper_verification_codes")
      .insert({
        user_id: userId,
        code: code,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to store verification code" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send email to admin
    const emailResponse = await resend.emails.send({
      from: "Campus Canteen <onboarding@resend.dev>",
      to: [ADMIN_EMAIL],
      subject: "Shopkeeper Verification Code Request",
      html: `
        <h1>Shopkeeper Access Request</h1>
        <p>A user is requesting shopkeeper access to Campus Canteen.</p>
        <p><strong>User Email:</strong> ${userEmail}</p>
        <p><strong>Verification Code:</strong></p>
        <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h2 style="font-size: 32px; letter-spacing: 8px; margin: 0; color: #333;">${code}</h2>
        </div>
        <p>This code expires in 10 minutes.</p>
        <p>Share this code with the user if you approve their request for shopkeeper access.</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, message: "Verification code sent to admin" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-shopkeeper-verification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
