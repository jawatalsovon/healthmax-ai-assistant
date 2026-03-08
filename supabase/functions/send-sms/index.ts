import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Channel = "sms" | "whatsapp";

const normalizePhone = (value: string) => {
  const v = value.trim();
  if (v.startsWith("whatsapp:")) return v.replace("whatsapp:", "").trim();
  return v;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return new Response(JSON.stringify({ error: "Twilio credentials not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { prescription_id, phone, message, channel = "sms" } = await req.json() as {
      prescription_id?: string;
      phone: string;
      message: string;
      channel?: Channel;
    };

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "phone and message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectedChannel: Channel = channel === "whatsapp" ? "whatsapp" : "sms";
    const cleanedTo = normalizePhone(phone);
    const cleanedFrom = normalizePhone(TWILIO_PHONE_NUMBER);

    const to = selectedChannel === "whatsapp" ? `whatsapp:${cleanedTo}` : cleanedTo;
    const from = selectedChannel === "whatsapp" ? `whatsapp:${cleanedFrom}` : cleanedFrom;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const authHeader = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: message,
      }).toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      throw new Error(`Twilio ${selectedChannel} error [${twilioResponse.status}]: ${JSON.stringify(twilioData)}`);
    }

    if (prescription_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("prescriptions").update({
        notified_via_sms: true,
        sms_sent_at: new Date().toISOString(),
      }).eq("id", prescription_id);
    }

    return new Response(JSON.stringify({ success: true, sid: twilioData.sid, channel: selectedChannel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Messaging error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
