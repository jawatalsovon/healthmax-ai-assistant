// @ts-ignore: URL imports are resolved by Deno runtime in Supabase Edge Functions.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: URL imports are resolved by Deno runtime in Supabase Edge Functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Twilio WhatsApp Webhook Handler
 * 
 * Flow:
 * 1. Patient sends WhatsApp message to the Twilio number
 * 2. Twilio POSTs the message here
 * 3. We call healthmax-triage edge function with the symptoms
 * 4. We reply back via Twilio WhatsApp API
 * 
 * Twilio webhook config:
 * Set "When a message comes in" URL to:
 * https://mykdpfqpvuvrhbomzvpe.supabase.co/functions/v1/twilio-whatsapp
 */

// Simple in-memory session store (per cold-start; for production use DB)
// We also store sessions in triage_sessions table for persistence

async function sendWhatsAppReply(to: string, body: string) {
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER")!;

  const cleanFrom = TWILIO_PHONE_NUMBER.replace("whatsapp:", "").trim();
  const from = `whatsapp:${cleanFrom}`;

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const authHeader = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const resp = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("Twilio send error:", err);
    throw new Error(`Twilio error [${resp.status}]: ${err}`);
  }
  return resp.json();
}

async function callTriageFunction(
  supabaseUrl: string,
  symptoms: string,
  sessionId: string | null,
  conversation: Array<{ role: string; content: string }>,
  language: string
) {
  const triageUrl = `${supabaseUrl}/functions/v1/healthmax-triage`;

  const resp = await fetch(triageUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
    },
    body: JSON.stringify({
      symptoms,
      language,
      session_id: sessionId,
      conversation,
      patient_info: null,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("Triage function error:", err);
    throw new Error(`Triage error [${resp.status}]: ${err}`);
  }

  return resp.json();
}

function detectLanguage(text: string): string {
  const banglaPattern = /[\u0980-\u09FF]/;
  return banglaPattern.test(text) ? "bn" : "en";
}

function formatTriageResponse(data: any, language: string): string {
  const isBn = language === "bn";
  let response = "";

  // Urgency
  if (data.urgency_level) {
    const urgencyLabels: Record<string, string> = {
      emergency: isBn ? "🚨 *জরুরি*" : "🚨 *EMERGENCY*",
      urgent: isBn ? "⚠️ *জরুরি প্রয়োজন*" : "⚠️ *URGENT*",
      moderate: isBn ? "🟡 *মাঝারি*" : "🟡 *MODERATE*",
      low: isBn ? "🟢 *কম ঝুঁকি*" : "🟢 *LOW RISK*",
    };
    response += (urgencyLabels[data.urgency_level] || `⚕️ *${data.urgency_level.toUpperCase()}*`) + "\n\n";
  }

  // Main advice
  if (data.advice) {
    response += data.advice + "\n\n";
  }

  // Diseases
  if (data.diseases && data.diseases.length > 0) {
    response += isBn ? "*সম্ভাব্য রোগ:*\n" : "*Possible conditions:*\n";
    for (const d of data.diseases.slice(0, 3)) {
      const name = d.name || d.disease_name || "Unknown";
      const confidenceValue = Number(d.confidence || 0);
      const confidencePercent = confidenceValue <= 1 ? Math.round(confidenceValue * 100) : Math.round(confidenceValue);
      const conf = confidencePercent ? ` (${confidencePercent}%)` : "";
      response += `• ${name}${conf}\n`;
    }
    response += "\n";
  }

  // Medicines
  if (data.medicines && data.medicines.length > 0) {
    response += isBn ? "*ওষুধের পরামর্শ:*\n" : "*Medicine suggestions:*\n";
    for (const m of data.medicines.slice(0, 5)) {
      const name = m.brand_name || m.name || "Unknown";
      const generic = m.generic_name ? ` (${m.generic_name})` : "";
      response += `• ${name}${generic}\n`;
    }
    response += "\n";
  }

  // Specialist
  if (data.specialist) {
    response += isBn
      ? `👨‍⚕️ *বিশেষজ্ঞ:* ${data.specialist}\n\n`
      : `👨‍⚕️ *See specialist:* ${data.specialist}\n\n`;
  }

  // Follow-up questions
  if (data.follow_up_questions && data.follow_up_questions.length > 0) {
    response += isBn ? "*আরও জানতে চাই:*\n" : "*Follow-up questions:*\n";
    for (let i = 0; i < Math.min(data.follow_up_questions.length, 3); i++) {
      const q = data.follow_up_questions[i];
      const text = typeof q === "string" ? q : q.question || q.text || JSON.stringify(q);
      response += `${i + 1}. ${text}\n`;
    }
    response += "\n";
  }

  // Home care
  if (data.home_care_advice) {
    response += isBn ? "*ঘরোয়া পরামর্শ:*\n" : "*Home care:*\n";
    response += data.home_care_advice + "\n\n";
  }

  // Disclaimer
  response += isBn
    ? "_⚠️ এটি AI পরামর্শ, ডাক্তারের বিকল্প নয়। গুরুতর হলে অবশ্যই ডাক্তার দেখান।_"
    : "_⚠️ This is AI-assisted advice, not a replacement for a doctor. Seek professional help for serious conditions._";

  return response;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required env vars");
    return new Response("<Response><Message>Service unavailable</Message></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }

  try {
    // Twilio sends form-encoded data
    const formData = await req.formData();
    const from = formData.get("From")?.toString() || "";      // e.g. whatsapp:+8801XXXXXXXXX
    const body = formData.get("Body")?.toString()?.trim() || "";
    const profileName = formData.get("ProfileName")?.toString() || "";

    console.log(`WhatsApp from ${from} (${profileName}): ${body}`);

    if (!body) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const cleanPhone = from.replace("whatsapp:", "").trim();
    const language = detectLanguage(body);

    // Handle special commands
    if (body.toLowerCase() === "reset" || body === "/reset" || body === "নতুন") {
      // Clear session
      await supabase
        .from("triage_sessions")
        .update({ conversation: [] })
        .eq("session_user_id", `wa_${cleanPhone}`)
        .order("created_at", { ascending: false })
        .limit(1);

      const resetMsg = language === "bn"
        ? "🔄 নতুন সেশন শুরু হয়েছে। আপনার লক্ষণ বলুন।"
        : "🔄 Session reset. Please describe your symptoms.";

      await sendWhatsAppReply(from, resetMsg);
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Find existing session for this phone number
    const { data: existingSessions } = await supabase
      .from("triage_sessions")
      .select("id, conversation")
      .eq("session_user_id", `wa_${cleanPhone}`)
      .order("created_at", { ascending: false })
      .limit(1);

    const existingSession = existingSessions?.[0] || null;
    const sessionId = existingSession?.id || null;
    const conversation = Array.isArray(existingSession?.conversation)
      ? existingSession.conversation as Array<{ role: string; content: string }>
      : [];

    // Call triage
    const triageResult = await callTriageFunction(
      SUPABASE_URL,
      body,
      sessionId,
      conversation,
      language
    );

    // Format response for WhatsApp
    const replyText = formatTriageResponse(triageResult, language);

    // Update session with wa_ prefix for tracking
    if (triageResult.session_id) {
      await supabase
        .from("triage_sessions")
        .update({ session_user_id: `wa_${cleanPhone}` })
        .eq("id", triageResult.session_id);
    }

    // Send reply via Twilio API (not TwiML, for reliability)
    await sendWhatsAppReply(from, replyText);

    // Return empty TwiML (we already sent the reply via API)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );

  } catch (e) {
    console.error("WhatsApp webhook error:", e);

    // Try to send error message back
    try {
      const formData = await req.clone().formData().catch(() => null);
      const from = formData?.get("From")?.toString();
      if (from) {
        await sendWhatsAppReply(
          from,
          "⚠️ Sorry, an error occurred. Please try again or type 'reset' to start over."
        );
      }
    } catch (_) { /* ignore */ }

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>An error occurred. Please try again.</Message></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  }
});
