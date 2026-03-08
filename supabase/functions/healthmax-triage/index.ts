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

// ─── ML CLASSIFIER ───
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
  const normalized = input.toLowerCase().replace(/[।,;.!?]+/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens: string[] = [];
  const words = normalized.split(' ');
  for (let n = 1; n <= 3; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      tokens.push(words.slice(i, i + n).join(' '));
    }
  }
  return tokens;
}

function calculateDiseaseScores(inputTokens: string[], diseases: DiseaseRow[]): MLPrediction[] {
  const scores: MLPrediction[] = [];
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
      const matched = inputTokens.some(token => 
        symptom.includes(token) || token.includes(symptom) ||
        levenshteinSimilarity(token, symptom) > 0.7
      );
      if (matched) {
        matchedSymptoms++;
        const idf = Math.log(totalDiseases / (symptomDocFreq[symptom] || 1));
        score += (1 + idf);
      }
    }
    if (matchedSymptoms === 0) continue;
    const coverage = matchedSymptoms / diseaseSymptoms.length;
    const finalScore = score * (0.5 + 0.5 * coverage);
    scores.push({
      name: disease.disease_name_en,
      name_bn: disease.disease_name_bn || disease.disease_name_en,
      confidence: finalScore,
      specialist: disease.specialist_type || 'General Practitioner',
      emergency: disease.emergency_flag || false,
    });
  }

  if (scores.length === 0) return [];
  scores.sort((a, b) => b.confidence - a.confidence);
  const top = scores.slice(0, 5);
  const totalScore = top.reduce((sum, s) => sum + s.confidence, 0);
  if (totalScore > 0) {
    for (const s of top) { s.confidence = Math.round((s.confidence / totalScore) * 100); }
  }
  const currentSum = top.reduce((s, t) => s + t.confidence, 0);
  if (currentSum > 0 && top.length > 0) { top[0].confidence += (100 - currentSum); }
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
    const { symptoms, language = "bn", session_id, conversation = [], patient_info, request_prescription } = await req.json();
    if (!symptoms) {
      return new Response(JSON.stringify({ error: "symptoms required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── LAYER 1: Safety Guard ──
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
          follow_up_questions: null,
          ml_classifier_used: true,
        };
        const sessionId = await logSession(supabase, symptoms, language, result, patient_info);
        return new Response(JSON.stringify({ ...result, session_id: sessionId }), {
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
          follow_up_questions: null,
          ml_classifier_used: true,
        };
        const sessionId = await logSession(supabase, symptoms, language, result, patient_info);
        return new Response(JSON.stringify({ ...result, session_id: sessionId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── LAYER 2: ML Classifier ──
    const [
      { data: allDiseases },
      { data: clinicalRules },
      { data: specialistData },
      { data: medicineNerData },
      { data: matrixData },
    ] = await Promise.all([
      supabase.from("symptoms_diseases").select("disease_name_en, disease_name_bn, symptoms, emergency_flag, specialist_type, description"),
      supabase.from("clinical_rules").select("symptom_pattern, urgency_level, recommended_action, recommended_action_bn"),
      supabase.from("specialist_classifications").select("problem_text, specialist, gender").limit(500),
      supabase.from("medicine_ner").select("medicine_name, organ, disease, pharmacological_class, common_medical_terms").limit(500),
      supabase.from("symptom_disease_matrix").select("disease_name, symptoms").limit(200),
    ]);

    let mlPredictions: MLPrediction[] = [];
    if (allDiseases && allDiseases.length > 0) {
      const inputTokens = tokenizeSymptoms(symptoms);
      mlPredictions = calculateDiseaseScores(inputTokens, allDiseases as DiseaseRow[]);
    }

    // ── LAYER 2b: Specialist prediction from classification dataset ──
    let specialistPrediction = '';
    if (specialistData && specialistData.length > 0) {
      const inputLower = symptoms.toLowerCase();
      let bestMatch = { specialist: '', score: 0 };
      for (const row of specialistData) {
        const problemTokens = row.problem_text.toLowerCase().split(/\s+/);
        const inputTokens = inputLower.split(/\s+/);
        let matchCount = 0;
        for (const pt of problemTokens) {
          if (pt.length > 2 && inputTokens.some((it: string) => it.includes(pt) || pt.includes(it))) {
            matchCount++;
          }
        }
        const score = matchCount / Math.max(problemTokens.length, 1);
        if (score > bestMatch.score) bestMatch = { specialist: row.specialist, score };
      }
      if (bestMatch.score > 0.3) specialistPrediction = bestMatch.specialist;
    }

    // ── LAYER 2c: Medicine NER context ──
    let medicineNerContext = '';
    if (medicineNerData && medicineNerData.length > 0) {
      // Find NER entries matching mentioned diseases/symptoms
      const inputLower = symptoms.toLowerCase();
      const relevantNer = medicineNerData.filter((ner: any) => {
        if (!ner.disease) return false;
        const diseases = ner.disease.toLowerCase().split(',').map((d: string) => d.trim());
        return diseases.some((d: string) => d.length > 2 && inputLower.includes(d));
      }).slice(0, 10);
      
      if (relevantNer.length > 0) {
        medicineNerContext = '\nMEDICINE-DISEASE KNOWLEDGE (from NER dataset):\n' + 
          relevantNer.map((n: any) => `- Medicine: ${n.medicine_name || 'N/A'} | Disease: ${n.disease} | Class: ${n.pharmacological_class || 'N/A'} | Organ: ${n.organ || 'N/A'}`).join('\n');
      }
    }

    // Build disease knowledge base for anti-hallucination
    const diseaseKnowledgeBase = allDiseases ? allDiseases.map((d: any) => 
      `Disease: ${d.disease_name_en} (${d.disease_name_bn || 'N/A'}) | Symptoms: ${d.symptoms.join(', ')} | Specialist: ${d.specialist_type || 'GP'} | Emergency: ${d.emergency_flag ? 'Yes' : 'No'} | Desc: ${d.description || 'N/A'}`
    ).join('\n') : '';

    const clinicalRulesContext = clinicalRules ? clinicalRules.map((r: any) =>
      `Rule: ${r.symptom_pattern} → Urgency: ${r.urgency_level} | Action: ${r.recommended_action}`
    ).join('\n') : '';

    // ── LAYER 3: LLM Clinical Reasoning ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const mlContext = mlPredictions.length > 0
      ? `\nML CLASSIFIER OUTPUT:\n${mlPredictions.map(p => `- ${p.name} (${p.name_bn}): ${p.confidence}% confidence, Specialist: ${p.specialist}`).join('\n')}`
      : '';

    const specialistContext = specialistPrediction
      ? `\nSPECIALIST PREDICTION (from classification dataset): ${specialistPrediction}`
      : '';

    const patientContext = patient_info 
      ? `\nPATIENT INFO: Name: ${patient_info.full_name || 'Unknown'}, Age: ${patient_info.age || 'Unknown'}, Gender: ${patient_info.gender || 'Unknown'}, Allergies: ${(patient_info.allergies || []).join(', ') || 'None'}, Chronic conditions: ${(patient_info.chronic_conditions || []).join(', ') || 'None'}`
      : '';

    const conversationCount = conversation.length;
    const needsMoreInfo = conversationCount < 4; // Ask follow-ups in early rounds

    const systemPrompt = `You are HealthMax, a clinical triage AI for Bangladesh. You assist Community Health Workers (CHWs).

CRITICAL ANTI-HALLUCINATION RULES:
1. You may ONLY suggest diseases that exist in the DISEASE DATABASE below. Do NOT invent diseases.
2. You may ONLY recommend medicines found in the Supabase medicines table. If unsure, suggest "consult doctor for prescription".
3. All confidence percentages must be based on symptom overlap with the database.
4. If symptoms don't clearly match any disease, say "Insufficient information" and ask more questions.
5. NEVER fabricate statistics, drug interactions, or treatment protocols not grounded in the database.

DISEASE DATABASE (ONLY use diseases from this list):
${diseaseKnowledgeBase}

CLINICAL RULES:
${clinicalRulesContext}
${mlContext}
${specialistContext}
${medicineNerContext}
${patientContext}

CONVERSATION RULES:
- Conversation round: ${conversationCount + 1}
- ${needsMoreInfo ? 'Ask 2-3 focused follow-up questions in a SINGLE response to gather more info efficiently. Questions should be specific and clinically relevant (not just yes/no). Example: "1) How long have you had the fever? 2) Do you have any rash? 3) Have you traveled recently?"' : 'You have enough context. Provide your final assessment with diseases, urgency, and recommendations.'}
- Make questions varied and informative, not repetitive yes/no.
- If the patient says they want a prescription, set can_generate_prescription to true.

Previous conversation: ${JSON.stringify(conversation)}

MUST use the triage_result tool.`;

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
          { role: "user", content: `Patient symptoms: "${symptoms}"\nLanguage: ${language}` },
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
                  follow_up_questions: {
                    type: "array",
                    description: "2-3 focused follow-up questions to narrow diagnosis. Use varied question types, not just yes/no.",
                    items: {
                      type: "object",
                      properties: {
                        question_en: { type: "string" },
                        question_bn: { type: "string" },
                        type: { type: "string", enum: ["yes_no", "choice", "open"] },
                        options_en: { type: "array", items: { type: "string" } },
                        options_bn: { type: "array", items: { type: "string" } },
                      },
                      required: ["question_en", "question_bn", "type"],
                    },
                  },
                  recommended_facility: { type: "string" },
                  recommended_facility_bn: { type: "string" },
                  specialist: { type: "string" },
                  can_generate_prescription: { type: "boolean", description: "True if enough info to generate a prescription" },
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
      
      // ML-only fallback
      if (mlPredictions.length > 0) {
        const fallbackResult = {
          urgency_level: mlPredictions[0].emergency ? "urgent" : "moderate",
          diseases: mlPredictions.map(p => ({ name: p.name, name_bn: p.name_bn, confidence: p.confidence })),
          explanation: `Based on symptom analysis: most likely ${mlPredictions[0].name}. Consult a ${mlPredictions[0].specialist}.`,
          explanation_bn: `লক্ষণ বিশ্লেষণে সবচেয়ে সম্ভাব্য রোগ ${mlPredictions[0].name_bn}। ${mlPredictions[0].specialist} এর পরামর্শ নিন।`,
          recommended_facility: "Upazila Health Complex",
          recommended_facility_bn: "উপজেলা স্বাস্থ্য কমপ্লেক্স",
          specialist: mlPredictions[0].specialist,
          medicines: [],
          follow_up_questions: null,
          ml_classifier_used: true,
          ai_fallback: true,
        };
        const sessionId = await logSession(supabase, symptoms, language, fallbackResult, patient_info);
        return new Response(JSON.stringify({ ...fallbackResult, session_id: sessionId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const result = JSON.parse(toolCall.function.arguments);
    result.ml_classifier_used = true;

    // ── LAYER 4: Enrich medicines from DB ──
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
          med.alternatives = dbMeds.slice(1).map((m: any) => ({
            brand: m.brand_name,
            manufacturer: m.manufacturer,
            price: m.price_info,
          }));
        }
      }
    }

    // Log session
    const sessionId = await logSession(supabase, symptoms, language, result, patient_info);

    return new Response(JSON.stringify({ ...result, session_id: sessionId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Triage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function logSession(supabase: any, symptoms: string, language: string, result: any, patient_info?: any) {
  try {
    const { data } = await supabase.from("triage_sessions").insert({
      symptoms_text: symptoms,
      language,
      urgency_level: result.urgency_level,
      diseases_predicted: result.diseases || [],
      medicines_suggested: result.medicines || [],
      follow_up_questions: result.follow_up_questions || [],
    }).select('id').single();
    return data?.id || null;
  } catch (err) {
    console.error("Failed to log session:", err);
    return null;
  }
}
