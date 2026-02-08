-- Add OTP/reset fields to profiles for staff password reset
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS otp_code text,
  ADD COLUMN IF NOT EXISTS otp_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS otp_attempts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reset_token text,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at timestamp with time zone;

-- Optional: index for reset token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_reset_token ON public.profiles (reset_token);
