import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Twilio Voice Webhook Handler
// Handles incoming calls, speech recognition in Bangla, and TTS responses
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return new Response(JSON.stringify({ error: "Twilio credentials not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "greeting";
    
    // Parse form data from Twilio webhook
    let formData: Record<string, string> = {};
    if (req.method === "POST") {
      const text = await req.text();
      for (const pair of text.split("&")) {
        const [key, value] = pair.split("=");
        formData[decodeURIComponent(key)] = decodeURIComponent(value || "");
      }
    }

    if (action === "greeting") {
      // Initial greeting - ask for symptoms in Bangla
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="bn-BD" voice="Google.bn-IN-Wavenet-A">
    হেলথম্যাক্সে স্বাগতম। আমি আপনার স্বাস্থ্য সমস্যা শুনতে চাই। অনুগ্রহ করে আপনার লক্ষণগুলো বলুন।
  </Say>
  <Gather input="speech" language="bn-BD" speechTimeout="5" action="${SUPABASE_URL}/functions/v1/twilio-voice?action=triage" method="POST">
    <Say language="bn-BD" voice="Google.bn-IN-Wavenet-A">বিপ এর পর আপনার লক্ষণ বলুন।</Say>
  </Gather>
  <Say language="bn-BD" voice="Google.bn-IN-Wavenet-A">কোনো উত্তর পাওয়া যায়নি। আবার চেষ্টা করুন।</Say>
  <Redirect>${SUPABASE_URL}/functions/v1/twilio-voice?action=greeting</Redirect>
</Response>`;
      return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    if (action === "triage") {
      const speechResult = formData["SpeechResult"] || "";
      const callerPhone = formData["From"] || "";

      if (!speechResult) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="bn-BD" voice="Google.bn-IN-Wavenet-A">আমি আপনার কথা বুঝতে পারিনি। আবার বলুন।</Say>
  <Redirect>${SUPABASE_URL}/functions/v1/twilio-voice?action=greeting</Redirect>
</Response>`;
        return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // Call our own triage function
      const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const triageResponse = await fetch(`${SUPABASE_URL}/functions/v1/healthmax-triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
        body: JSON.stringify({
          symptoms: speechResult,
          language: "bn",
          patient_info: { phone: callerPhone },
        }),
      });

      const triageData = await triageResponse.json();

      // Build Bangla response
      let responseText = triageData.explanation_bn || triageData.explanation || "আপনার লক্ষণ বিশ্লেষণ করা হয়েছে।";
      
      if (triageData.urgency_level === "emergency") {
        responseText = `জরুরি সতর্কতা! ${responseText}`;
      }

      if (triageData.diseases && triageData.diseases.length > 0) {
        responseText += ` সম্ভাব্য রোগ: ${triageData.diseases.map((d: any) => d.name_bn || d.name).join(', ')}।`;
      }

      if (triageData.recommended_facility_bn) {
        responseText += ` প্রস্তাবিত: ${triageData.recommended_facility_bn}।`;
      }

      // Ask if they want a prescription
      responseText += " আপনি কি প্রেসক্রিপশন চান? হ্যাঁ অথবা না বলুন।";

      const sessionId = triageData.session_id || "";

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="bn-BD" voice="Google.bn-IN-Wavenet-A">${responseText}</Say>
  <Gather input="speech" language="bn-BD" speechTimeout="3" action="${SUPABASE_URL}/functions/v1/twilio-voice?action=prescription&amp;session_id=${sessionId}" method="POST">
    <Say language="bn-BD" voice="Google.bn-IN-Wavenet-A">হ্যাঁ অথবা না বলুন।</Say>
  </Gather>
  <Say language="bn-BD" voice="Google.bn-IN-Wavenet-A">ধন্যবাদ। সুস্থ থাকুন।</Say>
</Response>`;
      return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    if (action === "prescription") {
      const speechResult = (formData["SpeechResult"] || "").toLowerCase();
      const sessionId = new URL(req.url).searchParams.get("session_id") || "";
      const callerPhone = formData["From"] || "";
      
      const wantsPrescription = speechResult.includes("হ্যাঁ") || speechResult.includes("yes") || speechResult.includes("ha");

      if (wantsPrescription && sessionId) {
        // Create prescription request
        const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        
        // Get session data
        const { data: session } = await supabase
          .from("triage_sessions")
          .select("*")
          .eq("id", sessionId)
          .single();

        if (session) {
          await supabase.from("prescriptions").insert({
            triage_session_id: sessionId,
            ai_generated_prescription: {
              diseases: session.diseases_predicted,
              medicines: session.medicines_suggested,
            },
            urgency_level: session.urgency_level,
            diseases: session.diseases_predicted,
            medicines: session.medicines_suggested,
            patient_symptoms: session.symptoms_text,
            status: "pending_review",
          });
        }

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="bn-BD" voice="Google.bn-IN-Wavenet-A">আপনার প্রেসক্রিপশন অনুরোধ পাঠানো হয়েছে। একজন ডাক্তার পর্যালোচনা করে SMS এ জানাবেন। ধন্যবাদ, সুস্থ থাকুন।</Say>
</Response>`;
        return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="bn-BD" voice="Google.bn-IN-Wavenet-A">ধন্যবাদ হেলথম্যাক্স ব্যবহার করার জন্য। সুস্থ থাকুন। আল্লাহ হাফেজ।</Say>
</Response>`;
      return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    return new Response("Unknown action", { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("Twilio voice error:", e);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="bn-BD" voice="Google.bn-IN-Wavenet-A">দুঃখিত, একটি ত্রুটি হয়েছে। পরে আবার চেষ্টা করুন।</Say>
</Response>`;
    return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
  }
});
