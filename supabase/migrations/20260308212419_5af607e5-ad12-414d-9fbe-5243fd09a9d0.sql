
-- Specialist classification table (from 660 Bengali patient cases)
CREATE TABLE public.specialist_classifications (
  id serial PRIMARY KEY,
  gender text,
  problem_text text NOT NULL,
  specialist text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.specialist_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Specialist classifications are publicly readable"
  ON public.specialist_classifications FOR SELECT
  USING (true);

-- Medicine NER knowledge base (from 3506 Bengali medical texts)
CREATE TABLE public.medicine_ner (
  id serial PRIMARY KEY,
  medical_text text NOT NULL,
  medicine_name text,
  organ text,
  disease text,
  hormone text,
  pharmacological_class text,
  common_medical_terms text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medicine_ner ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medicine NER data is publicly readable"
  ON public.medicine_ner FOR SELECT
  USING (true);

-- Symptom-disease binary matrix (from 758 rows × 172 symptom columns)
CREATE TABLE public.symptom_disease_matrix (
  id serial PRIMARY KEY,
  disease_name text NOT NULL,
  symptoms jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.symptom_disease_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Symptom disease matrix is publicly readable"
  ON public.symptom_disease_matrix FOR SELECT
  USING (true);
