-- Add Role and Subscription fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'admin'));

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'trial'));

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;

-- Policy for Admin (allows viewing/editing ALL profiles)
-- Note: We use a secure function or direct policy if possible.
-- Since we are running this SQL in dashboard, we can create the policy.

CREATE POLICY "Admins can CRUD all profiles" ON profiles 
FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Enable RLS (already enabled, but just in case)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
