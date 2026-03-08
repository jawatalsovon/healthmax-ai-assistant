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
    const body = await req.json();
    const { medicines, csv_text, clear_existing = false } = body;
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (clear_existing) {
      await supabase.from("medicines").delete().neq("id", 0);
    }

    let records: any[] = [];

    if (csv_text) {
      // Parse CSV text directly
      const lines = csv_text.split('\n').filter((l: string) => l.trim());
      records = lines.map((line: string) => {
        const cols = parseCSVLine(line);
        return {
          brand_name: cols[1] || 'Unknown',
          medicine_type: cols[2] || 'allopathic',
          slug: cols[3] || null,
          form: cols[4] || null,
          generic_name: cols[5] || null,
          strength: cols[6] || null,
          manufacturer: cols[7] || null,
          price_info: cols[8] || null,
          pack_info: cols[9] || null,
        };
      }).filter((m: any) => m.brand_name && m.brand_name !== 'Unknown');
    } else if (medicines && Array.isArray(medicines)) {
      records = medicines.map((m: any) => ({
        brand_name: m.brand_name || 'Unknown',
        generic_name: m.generic_name || null,
        form: m.form || null,
        strength: m.strength || null,
        manufacturer: m.manufacturer || null,
        price_info: m.price_info || null,
        slug: m.slug || null,
        medicine_type: m.medicine_type || 'allopathic',
        pack_info: m.pack_info || null,
      }));
    } else {
      return new Response(JSON.stringify({ error: "medicines array or csv_text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert in batches of 500
    const batchSize = 500;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase.from("medicines").insert(batch);
      if (error) {
        console.error("Batch insert error:", error);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    return new Response(JSON.stringify({ inserted, errors, total: records.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Medicine import error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
