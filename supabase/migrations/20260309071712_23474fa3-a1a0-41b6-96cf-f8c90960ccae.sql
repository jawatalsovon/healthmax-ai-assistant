-- Harden patient profile and prescription access so records are private per role

-- Helper: can current user access a prescription record?
CREATE OR REPLACE FUNCTION public.can_access_prescription(_rx_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.prescriptions p
    LEFT JOIN public.triage_sessions ts ON ts.id = p.triage_session_id
    LEFT JOIN public.patient_profiles pp ON pp.id = p.patient_profile_id
    WHERE p.id = _rx_id
      AND (
        public.has_role(_user_id, 'admin'::app_role)
        OR EXISTS (
          SELECT 1
          FROM public.registered_doctors rd
          WHERE rd.user_id = _user_id
            AND rd.id = p.doctor_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.registered_doctors rd
          WHERE rd.user_id = _user_id
            AND rd.id = p.preferred_doctor_id
        )
        OR ts.session_user_id = _user_id::text
        OR pp.user_id = _user_id
      )
  );
$$;

-- ===== prescriptions policies =====
DROP POLICY IF EXISTS "Anyone can view own prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Doctors can update assigned prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Anyone can create prescriptions" ON public.prescriptions;

CREATE POLICY "Users can view related prescriptions"
ON public.prescriptions
FOR SELECT
TO authenticated
USING (public.can_access_prescription(id, auth.uid()));

CREATE POLICY "Users can create own prescriptions"
ON public.prescriptions
FOR INSERT
TO authenticated
WITH CHECK (
  (
    triage_session_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.triage_sessions ts
      WHERE ts.id = prescriptions.triage_session_id
        AND ts.session_user_id = auth.uid()::text
    )
  )
  OR
  (
    patient_profile_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.patient_profiles pp
      WHERE pp.id = prescriptions.patient_profile_id
        AND pp.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Doctors and admins can update permitted prescriptions"
ON public.prescriptions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.registered_doctors rd
    WHERE rd.user_id = auth.uid()
      AND rd.is_verified = true
      AND (
        prescriptions.doctor_id = rd.id
        OR (
          prescriptions.status = 'pending_review'
          AND prescriptions.doctor_id IS NULL
          AND (prescriptions.preferred_doctor_id IS NULL OR prescriptions.preferred_doctor_id = rd.id)
        )
      )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.registered_doctors rd
    WHERE rd.user_id = auth.uid()
      AND rd.is_verified = true
      AND prescriptions.doctor_id = rd.id
  )
);

-- ===== patient_profiles policies =====
DROP POLICY IF EXISTS "Anyone can read own patient profile" ON public.patient_profiles;
DROP POLICY IF EXISTS "Anyone can update own patient profile" ON public.patient_profiles;
DROP POLICY IF EXISTS "Anyone can create patient profiles" ON public.patient_profiles;

CREATE POLICY "Users can read permitted patient profiles"
ON public.patient_profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.prescriptions p
    JOIN public.registered_doctors rd ON rd.id = p.doctor_id
    WHERE p.patient_profile_id = patient_profiles.id
      AND rd.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create own patient profile"
ON public.patient_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update permitted patient profile"
ON public.patient_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));