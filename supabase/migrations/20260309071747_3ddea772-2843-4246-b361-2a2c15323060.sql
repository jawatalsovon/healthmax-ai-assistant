-- Tighten triage session access (remove permissive true policies)
DROP POLICY IF EXISTS "Anyone can create triage sessions" ON public.triage_sessions;
DROP POLICY IF EXISTS "Anyone can read triage sessions" ON public.triage_sessions;
DROP POLICY IF EXISTS "Anyone can update triage sessions" ON public.triage_sessions;

CREATE POLICY "Users can create own triage sessions"
ON public.triage_sessions
FOR INSERT
TO authenticated
WITH CHECK (session_user_id = auth.uid()::text);

CREATE POLICY "Users can read permitted triage sessions"
ON public.triage_sessions
FOR SELECT
TO authenticated
USING (
  session_user_id = auth.uid()::text
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update permitted triage sessions"
ON public.triage_sessions
FOR UPDATE
TO authenticated
USING (
  session_user_id = auth.uid()::text
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  session_user_id = auth.uid()::text
  OR public.has_role(auth.uid(), 'admin'::app_role)
);