ALTER TABLE public.profiles
    ADD COLUMN image_credits INTEGER NOT NULL DEFAULT 30;

ALTER TABLE public.profiles
    ADD COLUMN last_credit_update_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMENT ON COLUMN public.profiles.image_credits IS 'Remaining credits for image generation.';
COMMENT ON COLUMN public.profiles.last_credit_update_at IS 'Timestamp of the last credit update or usage.';