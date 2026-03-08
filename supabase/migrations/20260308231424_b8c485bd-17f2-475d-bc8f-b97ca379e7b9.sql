-- Allow admins to delete registered_doctors (for rejecting applications)
CREATE POLICY "Admins can delete doctor registrations"
ON public.registered_doctors
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update any registered_doctors record (for approving)
CREATE POLICY "Admins can update any doctor record"
ON public.registered_doctors
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all registered_doctors (including unverified)
CREATE POLICY "Admins can view all doctors"
ON public.registered_doctors
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all user_roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));