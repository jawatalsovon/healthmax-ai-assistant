
-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Medicines table (DGDA drug database)
CREATE TABLE public.medicines (
  id SERIAL PRIMARY KEY,
  brand_name TEXT NOT NULL,
  medicine_type TEXT DEFAULT 'allopathic',
  slug TEXT,
  form TEXT,
  generic_name TEXT,
  strength TEXT,
  manufacturer TEXT,
  price_info TEXT,
  pack_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Medicines are publicly readable" ON public.medicines FOR SELECT USING (true);

CREATE INDEX idx_medicines_generic ON public.medicines(generic_name);
CREATE INDEX idx_medicines_brand ON public.medicines(brand_name);
CREATE INDEX idx_medicines_manufacturer ON public.medicines(manufacturer);

-- Symptoms-Diseases mapping table
CREATE TABLE public.symptoms_diseases (
  id SERIAL PRIMARY KEY,
  disease_name_en TEXT NOT NULL,
  disease_name_bn TEXT,
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  emergency_flag BOOLEAN DEFAULT false,
  specialist_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.symptoms_diseases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Symptoms diseases are publicly readable" ON public.symptoms_diseases FOR SELECT USING (true);

-- Clinical safety rules
CREATE TABLE public.clinical_rules (
  id SERIAL PRIMARY KEY,
  symptom_pattern TEXT NOT NULL,
  symptom_pattern_bn TEXT,
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('emergency', 'urgent', 'moderate', 'self_care')),
  recommended_action TEXT NOT NULL,
  recommended_action_bn TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinical rules are publicly readable" ON public.clinical_rules FOR SELECT USING (true);

-- Triage sessions log
CREATE TABLE public.triage_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symptoms_text TEXT NOT NULL,
  language TEXT DEFAULT 'bn',
  diseases_predicted JSONB DEFAULT '[]',
  urgency_level TEXT,
  medicines_suggested JSONB DEFAULT '[]',
  follow_up_questions JSONB DEFAULT '[]',
  conversation JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.triage_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create triage sessions" ON public.triage_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read triage sessions" ON public.triage_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can update triage sessions" ON public.triage_sessions FOR UPDATE USING (true);

CREATE TRIGGER update_triage_sessions_updated_at
  BEFORE UPDATE ON public.triage_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
