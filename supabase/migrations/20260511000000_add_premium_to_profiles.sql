ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
