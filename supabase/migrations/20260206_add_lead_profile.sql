ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS lead_profile jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS lead_profile_updated_at timestamptz;
