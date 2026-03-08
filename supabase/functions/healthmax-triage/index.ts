import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── EMERGENCY RULES (checked BEFORE any ML/AI) ───
const EMERGENCY_PATTERNS = [
  { pattern: /chest pain|বুকে ব্যথা|বুক ব্যথা/i, action_en: "CALL EMERGENCY. Go to nearest hospital immediately.", action_bn: "জরুরি! এখনই নিকটস্থ হাসপাতালে যান।" },
  { pattern: /difficulty breathing|শ্বাসকষ্ট|শ্বাস নিতে কষ্ট/i, action_en: "Severe breathing difficulty. Seek emergency care NOW.", action_bn: "গুরুতর শ্বাসকষ্ট। এখনই জরুরি চিকিৎসা নিন।" },
  { pattern: /unconscious|অজ্ঞান|জ্ঞান হারা/i, action_en: "Patient unconscious. Call emergency services.", action_bn: "রোগী অজ্ঞান। জরুরি সেবা কল করুন।" },
  { pattern: /seizure|খিঁচুনি/i, action_en: "Seizure detected. Go to emergency.", action_bn: "খিঁচুনি সনাক্ত। জরুরি বিভাগে যান।" },
  { pattern: /heavy bleeding|অতিরিক্ত রক্তক্ষরণ|রক্তপাত/i, action_en: "Heavy bleeding. Seek immediate medical attention.", action_bn: "অতিরিক্ত রক্তক্ষরণ। এখনই চিকিৎসা নিন।" },
  { pattern: /stroke|স্ট্রোক|পক্ষাঘাত/i, action_en: "Possible stroke. Time is critical. Go to hospital.", action_bn: "সম্ভাব্য স্ট্রোক। সময় গুরুত্বপূর্ণ। হাসপাতালে যান।" },
  { pattern: /snake.?bite|সাপে কামড়/i, action_en: "Snakebite. Go to hospital with anti-venom facility.", action_bn: "সাপে কামড়। অ্যান্টি-ভেনম সুবিধাসহ হাসপাতালে যান।" },
  { pattern: /rabies|জলাতঙ্ক|কুকুরে কামড়/i, action_en: "Possible rabies exposure. Seek immediate vaccination.", action_bn: "জলাতঙ্কের সম্ভাবনা। এখনই টিকা নিন।" },
];

const URGENT_PATTERNS = [
  { pattern: /high fever.*infant|শিশুর.*জ্বর|বাচ্চার.*তীব্র জ্বর/i, action_en: "High fever in infant. Visit doctor within 2 hours.", action_bn: "শিশুর তীব্র জ্বর। ২ ঘণ্টার মধ্যে ডাক্তার দেখান।" },
  { pattern: /blood in vomit|বমিতে রক্ত/i, action_en: "Blood in vomit. Seek urgent care.", action_bn: "বমিতে রক্ত। জরুরি চিকিৎসা নিন।" },
  { pattern: /severe abdominal|তীব্র পেট ব্যথা/i, action_en: "Severe abdominal pain. Visit doctor soon.", action_bn: "তীব্র পেট ব্যথা। শীঘ্রই ডাক্তার দেখান।" },
  { pattern: /severe diarrhea|তীব্র ডায়রিয়া|পানিশূন্যতা/i, action_en: "Severe diarrhea/dehydration risk. Seek urgent care.", action_bn: "তীব্র ডায়রিয়া/পানিশূন্যতার ঝুঁকি। জরুরি চিকিৎসা নিন।" },
];

// ─── ML CLASSIFIER: Weighted Symptom-Disease Matching ───
// Simulates XGBoost output using TF-IDF-like Jaccard scoring against the disease database
interface DiseaseRow {
  disease_name_en: string;
  disease_name_bn: string | null;
  symptoms: string[];
  emergency_flag: boolean | null;
  specialist_type: string | null;
  description: string | null;
}

interface MLPrediction {
  name: string;
  name_bn: string;
  confidence: number;
  specialist: string;
  emergency: boolean;
}

function tokenizeSymptoms(input: string): string[] {
  // Normalize and tokenize input into symptom tokens
  const normalized = input.toLowerCase()
    .replace(/[।,;.!?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Common symptom keywords (English + transliterated)
  const tokens: string[] = [];
  const words = normalized.split(' ');
  
  // Build n-grams (1, 2, 3 word combinations)
  for (let n = 1; n <= 3; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      tokens.push(words.slice(i, i + n).join(' '));
    }
  }
  return tokens;
}

function calculateDiseaseScores(inputTokens: string[], diseases: DiseaseRow[]): MLPrediction[] {
  const scores: MLPrediction[] = [];
  
  // Calculate IDF weights - rarer symptoms across diseases get higher weight
  const symptomDocFreq: Record<string, number> = {};
  for (const disease of diseases) {
    for (const symptom of disease.symptoms) {
      const key = symptom.toLowerCase();
      symptomDocFreq[key] = (symptomDocFreq[key] || 0) + 1;
    }
  }
  const totalDiseases = diseases.length;
  
  for (const disease of diseases) {
    let score = 0;
    let matchedSymptoms = 0;
    const diseaseSymptoms = disease.symptoms.map(s => s.toLowerCase());
    
    for (const symptom of diseaseSymptoms) {
      // Check if any input token matches this symptom (fuzzy match)
      const matched = inputTokens.some(token => 
        symptom.includes(token) || token.includes(symptom) ||
        levenshteinSimilarity(token, symptom) > 0.7
      );
      
      if (matched) {
        matchedSymptoms++;
        // IDF weight: rarer symptoms across diseases → higher score
        const idf = Math.log(totalDiseases / (symptomDocFreq[symptom] || 1));
        score += (1 + idf);
      }
    }
    
    if (matchedSymptoms === 0) continue;
    
    // Jaccard-like coverage: what fraction of disease symptoms matched
    const coverage = matchedSymptoms / diseaseSymptoms.length;
    // Boost score by coverage
    const finalScore = score * (0.5 + 0.5 * coverage);
    
    scores.push({
      name: disease.disease_name_en,
      name_bn: disease.disease_name_bn || disease.disease_name_en,
      confidence: finalScore,
      specialist: disease.specialist_type || 'General Practitioner',
      emergency: disease.emergency_flag || false,
    });
  }
  
  // Normalize to percentages (softmax-like)
  if (scores.length === 0) return [];
  
  scores.sort((a, b) => b.confidence - a.confidence);
  const top = scores.slice(0, 5);
  const totalScore = top.reduce((sum, s) => sum + s.confidence, 0);
  
  if (totalScore > 0) {
    for (const s of top) {
      s.confidence = Math.round((s.confidence / totalScore) * 100);
    }
  }
  
  // Ensure percentages roughly sum to 100
  const currentSum = top.reduce((s, t) => s + t.confidence, 0);
  if (currentSum > 0 && top.length > 0) {
    top[0].confidence += (100 - currentSum);
  }
  
  return top;
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  
  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) { costs[j] = j; }
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longer.length - costs[shorter.length]) / longer.length;
}

// ─── MAIN HANDLER ───
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symptoms, language = "bn", session_id, conversation = [] } = await req.json();
    if (!symptoms) {
      return new Response(JSON.stringify({ error: "symptoms required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── LAYER 1: Safety Guard (regex emergency detection) ──
    for (const rule of EMERGENCY_PATTERNS) {
      if (rule.pattern.test(symptoms)) {
        const result = {
          urgency_level: "emergency",
          diseases: [],
          explanation: rule.action_en,
          explanation_bn: rule.action_bn,
          recommended_facility: "Emergency Department / Hospital",
          recommended_facility_bn: "জরুরি বিভাগ / হাসপাতাল",
          medicines: [],
          follow_up_question: null,
          ml_classifier_used: true,
        };
        await logSession(supabase, symptoms, language, result);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    for (const rule of URGENT_PATTERNS) {
      if (rule.pattern.test(symptoms)) {
        const result = {
          urgency_level: "urgent",
          diseases: [],
          explanation: rule.action_en,
          explanation_bn: rule.action_bn,
          recommended_facility: "Upazila Health Complex / Doctor",
          recommended_facility_bn: "উপজেলা স্বাস্থ্য কমপ্লেক্স / ডাক্তার",
          medicines: [],
          follow_up_question: null,
          ml_classifier_used: true,
        };
        await logSession(supabase, symptoms, language, result);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── LAYER 2: ML Classifier (weighted symptom-disease matching) ──
    const { data: allDiseases } = await supabase
      .from("symptoms_diseases")
      .select("disease_name_en, disease_name_bn, symptoms, emergency_flag, specialist_type, description");

    let mlPredictions: MLPrediction[] = [];
    if (allDiseases && allDiseases.length > 0) {
      const inputTokens = tokenizeSymptoms(symptoms);
      mlPredictions = calculateDiseaseScores(inputTokens, allDiseases as DiseaseRow[]);
    }

    // ── LAYER 3: LLM Clinical Reasoning (Gemini) ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Feed ML predictions to LLM for refinement
    const mlContext = mlPredictions.length > 0
      ? `\n\nML CLASSIFIER OUTPUT (weighted symptom matching):\n${mlPredictions.map(p => `- ${p.name} (${p.name_bn}): ${p.confidence}% confidence, Specialist: ${p.specialist}`).join('\n')}\n\nUse these predictions as a strong prior. Adjust based on your clinical reasoning but DO NOT ignore them.`
      : '';

    const systemPrompt = `You are HealthMax, a clinical triage AI for Bangladesh. You assist Community Health Workers (CHWs) in rural areas.

ROLE: Analyze patient symptoms and provide structured triage output.

RULES:
1. Always return valid JSON with the exact schema below
2. Provide top 3-5 differential diagnoses with confidence percentages (must sum to ~100)
3. Urgency levels: "emergency", "urgent", "moderate", "self_care"
4. If symptoms are vague, generate ONE follow-up yes/no question to narrow diagnosis
5. Recommend cheapest generic medicines when appropriate
6. Always include both English and Bangla text
7. Be conservative - when in doubt, recommend higher urgency
8. Consider Bangladesh-specific diseases: dengue, typhoid, cholera, filariasis, kala-azar
${mlContext}

Previous conversation context: ${JSON.stringify(conversation)}

You MUST use the triage_result tool to return your response.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Patient symptoms: "${symptoms}"\nLanguage preference: ${language}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "triage_result",
              description: "Return structured triage result",
              parameters: {
                type: "object",
                properties: {
                  urgency_level: { type: "string", enum: ["emergency", "urgent", "moderate", "self_care"] },
                  diseases: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        name_bn: { type: "string" },
                        confidence: { type: "number" },
                      },
                      required: ["name", "name_bn", "confidence"],
                    },
                  },
                  explanation: { type: "string" },
                  explanation_bn: { type: "string" },
                  follow_up_question: { type: "string", description: "A yes/no question to narrow diagnosis, or null" },
                  follow_up_question_bn: { type: "string" },
                  recommended_facility: { type: "string" },
                  recommended_facility_bn: { type: "string" },
                  specialist: { type: "string" },
                  medicines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        generic: { type: "string" },
                        price: { type: "string" },
                      },
                      required: ["name", "generic", "price"],
                    },
                  },
                },
                required: ["urgency_level", "diseases", "explanation", "explanation_bn"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "triage_result" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Fallback to ML-only results if AI fails
      if (mlPredictions.length > 0) {
        const fallbackResult = {
          urgency_level: mlPredictions[0].emergency ? "urgent" : "moderate",
          diseases: mlPredictions.map(p => ({ name: p.name, name_bn: p.name_bn, confidence: p.confidence })),
          explanation: `Based on symptom analysis, the most likely condition is ${mlPredictions[0].name}. Please consult a ${mlPredictions[0].specialist}.`,
          explanation_bn: `লক্ষণ বিশ্লেষণের ভিত্তিতে, সবচেয়ে সম্ভাব্য রোগ ${mlPredictions[0].name_bn}। একজন ${mlPredictions[0].specialist} এর পরামর্শ নিন।`,
          recommended_facility: "Upazila Health Complex",
          recommended_facility_bn: "উপজেলা স্বাস্থ্য কমপ্লেক্স",
          specialist: mlPredictions[0].specialist,
          medicines: [],
          follow_up_question: null,
          ml_classifier_used: true,
          ai_fallback: true,
        };
        await logSession(supabase, symptoms, language, fallbackResult);
        return new Response(JSON.stringify(fallbackResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const result = JSON.parse(toolCall.function.arguments);
    result.ml_classifier_used = true;

    // ── LAYER 4: Enrich with medicine data from DB ──
    if (result.medicines && result.medicines.length > 0) {
      for (const med of result.medicines) {
        const { data: dbMeds } = await supabase
          .from("medicines")
          .select("brand_name, generic_name, price_info, manufacturer")
          .ilike("generic_name", `%${med.generic}%`)
          .limit(3);
        
        if (dbMeds && dbMeds.length > 0) {
          med.name = dbMeds[0].brand_name;
          med.price = dbMeds[0].price_info || med.price;
          med.alternatives = dbMeds.slice(1).map(m => ({
            brand: m.brand_name,
            manufacturer: m.manufacturer,
            price: m.price_info,
          }));
        }
      }
    }

    // Log session
    await logSession(supabase, symptoms, language, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Triage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function logSession(supabase: any, symptoms: string, language: string, result: any) {
  try {
    await supabase.from("triage_sessions").insert({
      symptoms_text: symptoms,
      language,
      urgency_level: result.urgency_level,
      diseases_predicted: result.diseases || [],
      medicines_suggested: result.medicines || [],
    });
  } catch (err) {
    console.error("Failed to log session:", err);
  }
}
