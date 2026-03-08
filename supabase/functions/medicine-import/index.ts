import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { medicines, clear_existing = false } = await req.json();
    
    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return new Response(JSON.stringify({ error: "medicines array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (clear_existing) {
      await supabase.from("medicines").delete().neq("id", 0);
    }

    // Insert in batches of 500
    const batchSize = 500;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < medicines.length; i += batchSize) {
      const batch = medicines.slice(i, i + batchSize).map((m: any) => ({
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

      const { error } = await supabase.from("medicines").insert(batch);
      if (error) {
        console.error("Batch insert error:", error);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    return new Response(JSON.stringify({ inserted, errors, total: medicines.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Medicine import error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
