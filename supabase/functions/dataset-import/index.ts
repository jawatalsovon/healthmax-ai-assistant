import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { dataset_type, data, clear_existing = false } = await req.json();
    
    if (!dataset_type || !data) {
      return new Response(JSON.stringify({ error: "dataset_type and data required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let inserted = 0;
    let errors = 0;

    if (dataset_type === "symptom_disease_matrix") {
      // Binary symptom-disease matrix: first col = disease name, rest = 0/1 per symptom
      if (clear_existing) await supabase.from("symptom_disease_matrix").delete().neq("id", 0);
      
      const { headers, rows } = data;
      const symptomNames = headers.slice(1); // Skip "prognosis" column
      
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize).map((row: any) => {
          const symptoms: Record<string, number> = {};
          const activeSymptoms: string[] = [];
          for (let j = 0; j < symptomNames.length; j++) {
            if (row.values[j] === 1) {
              symptoms[symptomNames[j]] = 1;
              // Extract English name from "বাংলা (English)" format
              const match = symptomNames[j].match(/\(([^)]+)\)/);
              activeSymptoms.push(match ? match[1].replace(/_/g, ' ') : symptomNames[j]);
            }
          }
          return { disease_name: row.disease, symptoms };
        });
        const { error } = await supabase.from("symptom_disease_matrix").insert(batch);
        if (error) { console.error("Matrix insert error:", error); errors += batch.length; }
        else inserted += batch.length;
      }

      // Also enrich symptoms_diseases table with active symptom arrays
      for (const row of rows) {
        const activeSymptoms: string[] = [];
        const symptomsBn: string[] = [];
        for (let j = 0; j < symptomNames.length; j++) {
          if (row.values[j] === 1) {
            const match = symptomNames[j].match(/\(([^)]+)\)/);
            const bnMatch = symptomNames[j].match(/^([^(]+)/);
            activeSymptoms.push(match ? match[1].replace(/_/g, ' ').toLowerCase() : symptomNames[j]);
            if (bnMatch) symptomsBn.push(bnMatch[1].trim());
          }
        }
        // Extract disease names
        const diseaseMatch = row.disease.match(/\(([^)]+)\)/);
        const diseaseEn = diseaseMatch ? diseaseMatch[1].replace(/_/g, ' ') : row.disease;
        const diseaseBnMatch = row.disease.match(/^([^(]+)/);
        const diseaseBn = diseaseBnMatch ? diseaseBnMatch[1].trim() : row.disease;

        // Upsert into symptoms_diseases
        const { data: existing } = await supabase
          .from("symptoms_diseases")
          .select("id")
          .eq("disease_name_en", diseaseEn)
          .limit(1);
        
        if (!existing || existing.length === 0) {
          // Merge English and Bengali symptom tokens
          const allSymptoms = [...new Set([...activeSymptoms, ...symptomsBn])];
          await supabase.from("symptoms_diseases").insert({
            disease_name_en: diseaseEn,
            disease_name_bn: diseaseBn,
            symptoms: allSymptoms,
          });
        }
      }
    } else if (dataset_type === "specialist_classification") {
      if (clear_existing) await supabase.from("specialist_classifications").delete().neq("id", 0);
      
      const batchSize = 200;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize).map((row: any) => ({
          gender: row.gender || null,
          problem_text: row.problem,
          specialist: row.specialist,
        }));
        const { error } = await supabase.from("specialist_classifications").insert(batch);
        if (error) { console.error("Specialist insert error:", error); errors += batch.length; }
        else inserted += batch.length;
      }
    } else if (dataset_type === "medicine_ner") {
      if (clear_existing) await supabase.from("medicine_ner").delete().neq("id", 0);
      
      const batchSize = 200;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize).map((row: any) => ({
          medical_text: row.medical_text,
          medicine_name: row.medicine_name || null,
          organ: row.organ || null,
          disease: row.disease || null,
          hormone: row.hormone || null,
          pharmacological_class: row.pharmacological_class || null,
          common_medical_terms: row.common_medical_terms || null,
        }));
        const { error } = await supabase.from("medicine_ner").insert(batch);
        if (error) { console.error("NER insert error:", error); errors += batch.length; }
        else inserted += batch.length;
      }
    } else {
      return new Response(JSON.stringify({ error: "Unknown dataset_type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ inserted, errors, dataset_type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Dataset import error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
