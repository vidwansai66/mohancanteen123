import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify, createRemoteJWKSet } from "https://deno.land/x/jose@v5.2.2/index.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = "saividwan.06@gmail.com";
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  userEmail: string;
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

// Verify Clerk JWT token
async function verifyClerkToken(token: string): Promise<{ userId: string } | null> {
  try {
    // Get Clerk's JWKS endpoint from the token's issuer
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return null;
    
    const payload = JSON.parse(atob(tokenParts[1]));
    const issuer = payload.iss;
    
    if (!issuer || !issuer.includes('clerk')) {
      console.log('Invalid issuer:', issuer);
      return null;
    }
    
    // Verify using JWKS
    const JWKS = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    
    const { payload: verifiedPayload } = await jwtVerify(token, JWKS, {
      issuer,
    });
    
    // Clerk stores user ID in 'sub' claim
    const userId = verifiedPayload.sub as string;
    if (!userId) return null;
    
    return { userId };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get and verify JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const verifiedUser = await verifyClerkToken(token);
    
    if (!verifiedUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const userId = verifiedUser.userId;
    const { userEmail }: VerificationRequest = await req.json();

    console.log(`Processing verification request for verified user: ${userId}, email: ${userEmail}`);

    if (!userEmail) {
      return new Response(JSON.stringify({ error: "Missing userEmail" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Rate limit: 3 requests per 10 minutes per verified userId
    if (!checkRateLimit(userId, 3, 10 * 60 * 1000)) {
      console.log(`Rate limit exceeded for user: ${userId}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait 10 minutes before trying again." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Database-level rate limiting: Check recent codes in the last 10 minutes
    const { data: recentCodes, error: checkError } = await supabase
      .from("shopkeeper_verification_codes")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if (checkError) {
      console.error("Error checking recent codes:", checkError);
    } else if (recentCodes && recentCodes.length >= 3) {
      console.log(`Database rate limit exceeded for user: ${userId}`);
      return new Response(
        JSON.stringify({ error: "Too many verification requests. Please wait 10 minutes." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

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
        <p><strong>User ID:</strong> ${userId}</p>
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