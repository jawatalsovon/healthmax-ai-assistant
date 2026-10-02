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

// ─── BanglaBERT EMBEDDING HELPER ───
async function getBanglaBertEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/csebuetnlp/banglabert",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      }
    );
    if (!response.ok) {
      console.warn("BanglaBERT API error:", response.status);
      return null;
    }
    const data = await response.json();
    // HF feature-extraction returns [[token_embeddings...]]; average pool to single vector
    if (Array.isArray(data) && Array.isArray(data[0]) && Array.isArray(data[0][0])) {
      const tokenVecs: number[][] = data[0];
      const dim = tokenVecs[0].length;
      const avg = new Array(dim).fill(0);
      for (const vec of tokenVecs) {
        for (let d = 0; d < dim; d++) avg[d] += vec[d];
      }
      for (let d = 0; d < dim; d++) avg[d] /= tokenVecs.length;
      return avg;
    }
    return null;
  } catch (e) {
    console.warn("BanglaBERT fetch failed:", e);
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-8);
}

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

function normalizeUrgencyLevel(level: string | null | undefined): string {
  const normalized = (level || "").toLowerCase();
  if (normalized === "emergency") return "emergency";
  if (normalized === "urgent") return "urgent";
  if (normalized === "self-care" || normalized === "self_care") return "self_care";
  if (normalized === "moderate") return "moderate";
  return "moderate";
}

function normalizeBackendResult(data: any) {
  const diseases = Array.isArray(data?.diseases)
    ? data.diseases
    : Array.isArray(data?.top_diseases)
      ? data.top_diseases.map((d: any) => ({
          name: d.disease || d.name || "Unknown",
          name_bn: d.disease || d.name_bn || d.name || "Unknown",
          confidence: ((d.probability ?? d.confidence ?? 0) <= 1 ? (d.probability ?? d.confidence ?? 0) * 100 : (d.probability ?? d.confidence ?? 0)),
        }))
      : [];

  const medicines = Array.isArray(data?.medicines)
    ? data.medicines
    : Array.isArray(data?.drug_recommendations)
      ? data.drug_recommendations.map((m: any) => ({
          name: m.brand_example || m.name || "Unknown",
          generic: m.generic_name || m.generic || "Unknown",
          price: m.price ? String(m.price) : `৳${Number(m.price_bdt || 0).toFixed(2)} / ${m.unit || "unit"}`,
        }))
      : [];

  return {
    ...data,
    urgency_level: normalizeUrgencyLevel(data?.urgency_level),
    diseases,
    medicines,
    recommended_facility: data?.recommended_facility || data?.facility_recommendation || "",
    recommended_facility_bn: data?.recommended_facility_bn || data?.facility_recommendation || "",
    explanation: data?.explanation || data?.llm_response || "",
    explanation_bn: data?.explanation_bn || data?.llm_response || data?.explanation || "",
    ml_classifier_used: data?.ml_classifier_used ?? true,
    ai_fallback: data?.ai_fallback ?? true,
  };
}

async function callBackendTriage(apiUrl: string, symptoms: string, language: string) {
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/triage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: symptoms, language }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("Backend triage error:", response.status, errorText);
      return null;
    }

    return normalizeBackendResult(await response.json());
  } catch (error) {
    console.warn("Backend triage fetch failed:", error);
    return null;
  }
}

// ─── AGENT HELPERS ───
async function callAgent(apiKey: string, model: string, systemPrompt: string, userContent: string, tools?: any[], toolChoice?: any): Promise<any> {
  const body: any = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = toolChoice || "auto";
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Agent error (${model}):`, response.status, errText);
    throw { status: response.status, message: errText };
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    return JSON.parse(toolCall.function.arguments);
  }
  // Fallback: return text content
  return { text: data.choices?.[0]?.message?.content || "" };
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
    const HEALTHMAX_API_URL = Deno.env.get("HEALTHMAX_API_URL") || "";

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
        const notesSummary = await summarizeTriageNotes(
          LOVABLE_API_KEY,
          language,
          symptoms,
          conversation,
          result,
          patientContextFromInfo(patient_info)
        );
        const sessionId = await logSession(supabase, {
          existingSessionId: session_id,
          language,
          result,
          notesSummary,
        });
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
        const notesSummary = await summarizeTriageNotes(
          LOVABLE_API_KEY,
          language,
          symptoms,
          conversation,
          result,
          patientContextFromInfo(patient_info)
        );
        const sessionId = await logSession(supabase, {
          existingSessionId: session_id,
          language,
          result,
          notesSummary,
        });
        return new Response(JSON.stringify({ ...result, session_id: sessionId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (HEALTHMAX_API_URL) {
      const backendResult = await callBackendTriage(HEALTHMAX_API_URL, symptoms, language);
      if (backendResult) {
        const notesSummary = await summarizeTriageNotes(
          LOVABLE_API_KEY,
          language,
          symptoms,
          conversation,
          backendResult,
          patientContextFromInfo(patient_info)
        );
        const sessionId = await logSession(supabase, {
          existingSessionId: session_id,
          language,
          result: backendResult,
          notesSummary,
        });
        return new Response(JSON.stringify({ ...backendResult, session_id: sessionId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── LAYER 2: ML Classifier + Data Fetch ──
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
    let banglaBertUsed = false;
    if (allDiseases && allDiseases.length > 0) {
      const inputTokens = tokenizeSymptoms(symptoms);
      
      // Try BanglaBERT embeddings for Bangla input
      const isBangla = /[\u0980-\u09FF]/.test(symptoms);
      if (isBangla) {
        console.log("[BanglaBERT] Attempting embedding-based matching for Bangla input...");
        const inputEmb = await getBanglaBertEmbedding(symptoms);
        if (inputEmb) {
          // Get embeddings for each disease's Bangla name + symptoms
          const embeddingScores: { disease: DiseaseRow; score: number }[] = [];
          // Batch: get embeddings for top disease names (limit to avoid rate limits)
          const candidateDiseases = (allDiseases as DiseaseRow[]).slice(0, 50);
          for (const disease of candidateDiseases) {
            const diseaseText = disease.disease_name_bn || disease.disease_name_en;
            const diseaseEmb = await getBanglaBertEmbedding(diseaseText);
            if (diseaseEmb) {
              const sim = cosineSimilarity(inputEmb, diseaseEmb);
              embeddingScores.push({ disease, score: sim });
            }
          }
          if (embeddingScores.length > 0) {
            embeddingScores.sort((a, b) => b.score - a.score);
            const top5 = embeddingScores.slice(0, 5);
            const totalScore = top5.reduce((s, t) => s + Math.max(0, t.score), 0);
            mlPredictions = top5.map(item => ({
              name: item.disease.disease_name_en,
              name_bn: item.disease.disease_name_bn || item.disease.disease_name_en,
              confidence: totalScore > 0 ? Math.round((Math.max(0, item.score) / totalScore) * 100) : 20,
              specialist: item.disease.specialist_type || 'General Practitioner',
              emergency: item.disease.emergency_flag || false,
            }));
            banglaBertUsed = true;
            console.log("[BanglaBERT] Embedding matching succeeded, top match:", mlPredictions[0]?.name);
          }
        }
      }
      
      // Fallback to TF-IDF + Levenshtein
      if (!banglaBertUsed) {
        mlPredictions = calculateDiseaseScores(inputTokens, allDiseases as DiseaseRow[]);
      }
    }

    // Specialist prediction
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

    // Medicine NER context
    let medicineNerContext = '';
    if (medicineNerData && medicineNerData.length > 0) {
      const inputLower = symptoms.toLowerCase();
      const relevantNer = medicineNerData.filter((ner: any) => {
        if (!ner.disease) return false;
        const diseases = ner.disease.toLowerCase().split(',').map((d: string) => d.trim());
        return diseases.some((d: string) => d.length > 2 && inputLower.includes(d));
      }).slice(0, 10);
      if (relevantNer.length > 0) {
        medicineNerContext = relevantNer.map((n: any) => `- Medicine: ${n.medicine_name || 'N/A'} | Disease: ${n.disease} | Class: ${n.pharmacological_class || 'N/A'} | Organ: ${n.organ || 'N/A'}`).join('\n');
      }
    }

    // Build knowledge bases
    const diseaseKnowledgeBase = allDiseases ? allDiseases.map((d: any) =>
      `${d.disease_name_en} (${d.disease_name_bn || 'N/A'}) | Symptoms: ${d.symptoms.join(', ')} | Specialist: ${d.specialist_type || 'GP'} | Emergency: ${d.emergency_flag ? 'Yes' : 'No'}`
    ).join('\n') : '';

    const clinicalRulesContext = clinicalRules ? clinicalRules.map((r: any) =>
      `${r.symptom_pattern} → ${r.urgency_level} | ${r.recommended_action}`
    ).join('\n') : '';

    const mlContext = mlPredictions.length > 0
      ? mlPredictions.map(p => `- ${p.name} (${p.name_bn}): ${p.confidence}% | Specialist: ${p.specialist}`).join('\n')
      : 'No strong ML matches found.';

    const patientContext = patient_info
      ? `Name: ${patient_info.full_name || 'Unknown'}, Age: ${patient_info.age || 'Unknown'}, Gender: ${patient_info.gender || 'Unknown'}, Allergies: ${(patient_info.allergies || []).join(', ') || 'None'}, Chronic: ${(patient_info.chronic_conditions || []).join(', ') || 'None'}`
      : 'No patient info provided.';

    const conversationCount = conversation.length;
    const needsMoreInfo = conversationCount < 4;

    // ── LAYER 3: MULTI-AGENT PIPELINE ──
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    try {
      // ══════════════════════════════════════════════
      // AGENT 1: Symptom Analyst
      // ══════════════════════════════════════════════
      console.log("[Agent 1] Symptom Analyst starting...");
      const agent1Result = await callAgent(
        LOVABLE_API_KEY,
        "google/gemini-2.5-flash",
        `You are a medical Symptom Analyst AI specializing in Bangladesh healthcare. Your ONLY job is to extract and structure symptoms from patient input.

RULES:
- Extract every symptom mentioned (explicit and implied)
- Normalize symptom names to standard medical terms
- Identify duration, severity, and body location if mentioned
- Detect if the patient is describing symptoms in Bengali or English
- Output structured JSON via the tool call
- Do NOT diagnose. Do NOT suggest treatment. Only extract symptoms.`,
        `Patient says: "${symptoms}"
Language: ${language}
Previous conversation: ${JSON.stringify(conversation)}
Patient info: ${patientContext}`,
        [{
          type: "function",
          function: {
            name: "extract_symptoms",
            description: "Extract structured symptoms from patient input",
            parameters: {
              type: "object",
              properties: {
                symptoms_extracted: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      symptom_en: { type: "string", description: "Standard medical term in English" },
                      symptom_bn: { type: "string", description: "Bengali translation" },
                      severity: { type: "string", enum: ["mild", "moderate", "severe", "unknown"] },
                      duration: { type: "string", description: "How long, e.g. '3 days', 'unknown'" },
                      body_location: { type: "string", description: "Body part affected" },
                    },
                    required: ["symptom_en", "symptom_bn", "severity"],
                  },
                },
                patient_distress_level: { type: "string", enum: ["calm", "worried", "distressed", "panicked"] },
                additional_context: { type: "string", description: "Any relevant context inferred from input" },
              },
              required: ["symptoms_extracted", "patient_distress_level"],
              additionalProperties: false,
            },
          },
        }],
        { type: "function", function: { name: "extract_symptoms" } }
      );
      console.log("[Agent 1] Result:", JSON.stringify(agent1Result).slice(0, 300));

      // ══════════════════════════════════════════════
      // AGENT 2: Diagnostic Classifier
      // ══════════════════════════════════════════════
      console.log("[Agent 2] Diagnostic Classifier starting...");
      const agent2Result = await callAgent(
        LOVABLE_API_KEY,
        "google/gemini-2.5-flash",
        `You are a medical Diagnostic Classifier AI for Bangladesh. You receive structured symptoms and must match them against a disease database.

CRITICAL ANTI-HALLUCINATION RULES:
1. You may ONLY suggest diseases from the DISEASE DATABASE below. Do NOT invent diseases.
2. Confidence must reflect symptom overlap with database entries.
3. If symptoms don't match well, say "Insufficient data" with low confidence.
4. Consider patient age, gender, and chronic conditions in your assessment.

DISEASE DATABASE:
${diseaseKnowledgeBase}

CLINICAL RULES:
${clinicalRulesContext}

ML CLASSIFIER PREDICTIONS:
${mlContext}

SPECIALIST DATASET PREDICTION: ${specialistPrediction || 'None'}`,
        `Structured symptoms from Agent 1: ${JSON.stringify(agent1Result)}
Patient info: ${patientContext}
Conversation round: ${conversationCount + 1}`,
        [{
          type: "function",
          function: {
            name: "diagnose",
            description: "Provide diagnostic classification based on symptoms",
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
                      confidence: { type: "number", description: "0-100 percentage" },
                    },
                    required: ["name", "name_bn", "confidence"],
                  },
                },
                specialist: { type: "string" },
                recommended_facility: { type: "string" },
                recommended_facility_bn: { type: "string" },
                needs_more_info: { type: "boolean", description: "True if more symptoms needed for confident diagnosis" },
                diagnostic_reasoning: { type: "string", description: "Brief internal reasoning about the diagnosis" },
              },
              required: ["urgency_level", "diseases", "specialist", "needs_more_info"],
              additionalProperties: false,
            },
          },
        }],
        { type: "function", function: { name: "diagnose" } }
      );
      console.log("[Agent 2] Result:", JSON.stringify(agent2Result).slice(0, 300));

      // ══════════════════════════════════════════════
      // AGENT 3: Treatment Advisor
      // ══════════════════════════════════════════════
      console.log("[Agent 3] Treatment Advisor starting...");
      const agent3Result = await callAgent(
        LOVABLE_API_KEY,
        "google/gemini-3-flash-preview",
        `You are a Treatment Advisor AI for Bangladesh healthcare. You receive a diagnosis and must provide treatment advice, medicine recommendations, follow-up questions, and a patient-friendly explanation.

RULES:
1. Only recommend medicines from the MEDICINE DATABASE below. If unsure, say "consult doctor for prescription".
2. Provide explanation in BOTH English and Bengali.
3. Be empathetic and clear for Community Health Workers (CHWs).
4. ${needsMoreInfo ? 'The diagnosis agent says more info is needed. Generate 2-3 focused follow-up questions (varied types, not just yes/no).' : 'Provide final treatment advice.'}
5. If the patient mentioned wanting a prescription, set can_generate_prescription to true.
6. Consider patient allergies and chronic conditions when recommending medicines.

MEDICINE-DISEASE KNOWLEDGE:
${medicineNerContext || 'No specific medicine-disease matches found.'}

DIAGNOSIS FROM AGENT 2:
${JSON.stringify(agent2Result)}

PATIENT INFO: ${patientContext}
CONVERSATION ROUND: ${conversationCount + 1}
PREVIOUS CONVERSATION: ${JSON.stringify(conversation)}`,
        `Original patient input: "${symptoms}"
Language preference: ${language}`,
        [{
          type: "function",
          function: {
            name: "treatment_plan",
            description: "Provide complete treatment advice and patient-facing output",
            parameters: {
              type: "object",
              properties: {
                explanation: { type: "string", description: "Patient-friendly explanation in English" },
                explanation_bn: { type: "string", description: "Patient-friendly explanation in Bengali" },
                follow_up_questions: {
                  type: "array",
                  description: "2-3 focused follow-up questions if more info needed",
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
                can_generate_prescription: { type: "boolean" },
                home_care_advice_en: { type: "string", description: "Self-care tips in English" },
                home_care_advice_bn: { type: "string", description: "Self-care tips in Bengali" },
              },
              required: ["explanation", "explanation_bn"],
              additionalProperties: false,
            },
          },
        }],
        { type: "function", function: { name: "treatment_plan" } }
      );
      console.log("[Agent 3] Result:", JSON.stringify(agent3Result).slice(0, 300));

      // ── MERGE AGENT OUTPUTS ──
      const mergedResult = {
        urgency_level: agent2Result.urgency_level || "moderate",
        diseases: agent2Result.diseases || [],
        explanation: agent3Result.explanation || "",
        explanation_bn: agent3Result.explanation_bn || "",
        follow_up_questions: agent3Result.follow_up_questions || null,
        recommended_facility: agent2Result.recommended_facility || "",
        recommended_facility_bn: agent2Result.recommended_facility_bn || "",
        specialist: agent2Result.specialist || specialistPrediction || "General Practitioner",
        medicines: agent3Result.medicines || [],
        can_generate_prescription: agent3Result.can_generate_prescription || false,
        ml_classifier_used: true,
        ai_fallback: false,
        // Extra agentic metadata
        _agent_meta: {
          symptoms_extracted: agent1Result.symptoms_extracted?.length || 0,
          distress_level: agent1Result.patient_distress_level,
          diagnostic_reasoning: agent2Result.diagnostic_reasoning,
          home_care_en: agent3Result.home_care_advice_en,
          home_care_bn: agent3Result.home_care_advice_bn,
        },
      };

      // ── LAYER 4: Enrich medicines from DB ──
      if (mergedResult.medicines && mergedResult.medicines.length > 0) {
        for (const med of mergedResult.medicines) {
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

      // Log or update a single session record for the whole conversation
      const notesSummary = await summarizeTriageNotes(
        LOVABLE_API_KEY,
        language,
        symptoms,
        conversation,
        mergedResult,
        patientContext
      );

      const sessionId = await logSession(supabase, {
        existingSessionId: session_id,
        language,
        result: mergedResult,
        notesSummary,
      });

      return new Response(JSON.stringify({ ...mergedResult, session_id: sessionId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (agentErr: any) {
      console.error("Agent pipeline error:", agentErr);

      // Handle rate limit / payment errors
      if (agentErr.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (agentErr.status === 402) {
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
        const notesSummary = await summarizeTriageNotes(
          LOVABLE_API_KEY,
          language,
          symptoms,
          conversation,
          fallbackResult,
          patientContextFromInfo(patient_info)
        );

        const sessionId = await logSession(supabase, {
          existingSessionId: session_id,
          language,
          result: fallbackResult,
          notesSummary,
        });
        return new Response(JSON.stringify({ ...fallbackResult, session_id: sessionId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw agentErr;
    }
  } catch (e) {
    console.error("Triage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function patientContextFromInfo(patient_info: any) {
  if (!patient_info) return "No patient info provided.";
  return `Name: ${patient_info.full_name || 'Unknown'}, Age: ${patient_info.age || 'Unknown'}, Gender: ${patient_info.gender || 'Unknown'}, Allergies: ${(patient_info.allergies || []).join(', ') || 'None'}, Chronic: ${(patient_info.chronic_conditions || []).join(', ') || 'None'}`;
}

async function summarizeTriageNotes(
  apiKey: string,
  language: string,
  symptoms: string,
  conversation: Array<{ role: string; content: string }>,
  result: any,
  patientContext: string
): Promise<{ summary_text: string; key_notes: string[] }> {
  const fallbackNotes = [
    `Primary symptoms: ${symptoms}`,
    result?.diseases?.[0]?.name ? `Top likely condition: ${result.diseases[0].name}` : undefined,
    result?.urgency_level ? `Urgency: ${result.urgency_level}` : undefined,
    result?.specialist ? `Suggested specialist: ${result.specialist}` : undefined,
  ].filter(Boolean) as string[];

  if (!apiKey) {
    return {
      summary_text: fallbackNotes.join('\n• '),
      key_notes: fallbackNotes,
    };
  }

  try {
    const recentConversation = (conversation || [])
      .slice(-12)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const summary = await callAgent(
      apiKey,
      "google/gemini-2.5-flash-lite",
      `You summarize a medical triage conversation into concise clinical key notes.
Rules:
- Return ONLY key medical points (max 6 bullets)
- Include symptom progression, red flags, key yes/no clarifications, urgency, and likely diagnosis
- Keep each bullet short and factual
- Output using tool call`,
      `Language: ${language}\nPatient: ${patientContext}\nLatest input: ${symptoms}\nConversation:\n${recentConversation}\nCurrent triage result: ${JSON.stringify(result)}`,
      [{
        type: "function",
        function: {
          name: "summarize_key_notes",
          description: "Summarize triage into key clinical notes",
          parameters: {
            type: "object",
            properties: {
              key_notes: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["key_notes"],
            additionalProperties: false,
          },
        },
      }],
      { type: "function", function: { name: "summarize_key_notes" } }
    );

    const keyNotes = Array.isArray(summary?.key_notes) && summary.key_notes.length > 0
      ? summary.key_notes.slice(0, 6)
      : fallbackNotes;

    return {
      summary_text: keyNotes.map((n: string) => `• ${n}`).join("\n"),
      key_notes: keyNotes,
    };
  } catch (err) {
    console.warn("Summary generation failed, using fallback notes", err);
    return {
      summary_text: fallbackNotes.map((n) => `• ${n}`).join("\n"),
      key_notes: fallbackNotes,
    };
  }
}

async function logSession(
  supabase: any,
  params: {
    existingSessionId?: string | null;
    language: string;
    result: any;
    notesSummary: { summary_text: string; key_notes: string[] };
  }
) {
  try {
    const payload = {
      symptoms_text: params.notesSummary.summary_text || "• Triage summary not available",
      language: params.language,
      urgency_level: params.result.urgency_level,
      diseases_predicted: params.result.diseases || [],
      medicines_suggested: params.result.medicines || [],
      follow_up_questions: params.result.follow_up_questions || [],
      conversation: {
        key_notes: params.notesSummary.key_notes || [],
        summarized_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };

    if (params.existingSessionId) {
      const { data: updated } = await supabase
        .from("triage_sessions")
        .update(payload)
        .eq("id", params.existingSessionId)
        .select("id")
        .maybeSingle();

      if (updated?.id) return updated.id;
    }

    const { data } = await supabase
      .from("triage_sessions")
      .insert(payload)
      .select("id")
      .single();

    return data?.id || null;
  } catch (err) {
    console.error("Failed to log session:", err);
    return null;
  }
}
