
-- Patient profiles (extends base profiles for medical data)
CREATE TABLE public.patient_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_user_id text, -- for anonymous users (no login)
  full_name text,
  age integer,
  gender text,
  phone text,
  address text,
  blood_group text,
  allergies text[],
  chronic_conditions text[],
  emergency_contact_name text,
  emergency_contact_phone text,
  preferred_doctor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create patient profiles" ON public.patient_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read own patient profile" ON public.patient_profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can update own patient profile" ON public.patient_profiles FOR UPDATE USING (true);

-- Registered doctors table
CREATE TABLE public.registered_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  bmdc_reg_number text NOT NULL UNIQUE,
  specialization text,
  phone text,
  email text,
  hospital_affiliation text,
  is_verified boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  verified_by uuid,
  verified_at timestamptz,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.registered_doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view verified doctors" ON public.registered_doctors FOR SELECT USING (is_verified = true OR auth.uid() = user_id);
CREATE POLICY "Doctors can insert own record" ON public.registered_doctors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Doctors can update own record" ON public.registered_doctors FOR UPDATE USING (auth.uid() = user_id);

-- Prescriptions table
CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triage_session_id uuid REFERENCES public.triage_sessions(id) ON DELETE SET NULL,
  patient_profile_id uuid REFERENCES public.patient_profiles(id),
  doctor_id uuid REFERENCES public.registered_doctors(id),
  preferred_doctor_id uuid REFERENCES public.registered_doctors(id),
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'under_review', 'signed', 'rejected', 'revised')),
  ai_generated_prescription jsonb NOT NULL DEFAULT '{}'::jsonb,
  doctor_notes text,
  doctor_revised_prescription jsonb,
  final_prescription jsonb,
  urgency_level text,
  diseases jsonb DEFAULT '[]'::jsonb,
  medicines jsonb DEFAULT '[]'::jsonb,
  patient_symptoms text,
  triage_summary jsonb,
  signed_at timestamptz,
  notified_via_sms boolean DEFAULT false,
  sms_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create prescriptions" ON public.prescriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view own prescriptions" ON public.prescriptions FOR SELECT USING (true);
CREATE POLICY "Doctors can update assigned prescriptions" ON public.prescriptions FOR UPDATE USING (true);

-- Link triage_sessions to patient_profile
ALTER TABLE public.triage_sessions ADD COLUMN IF NOT EXISTS patient_profile_id uuid REFERENCES public.patient_profiles(id);
ALTER TABLE public.triage_sessions ADD COLUMN IF NOT EXISTS session_user_id text;

-- Add triggers for updated_at
CREATE TRIGGER update_patient_profiles_updated_at BEFORE UPDATE ON public.patient_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_registered_doctors_updated_at BEFORE UPDATE ON public.registered_doctors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for prescriptions (doctor notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
