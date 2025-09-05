CREATE OR REPLACE FUNCTION public.reset_and_get_image_credits()
RETURNS integer AS $$
DECLARE
current_credits integer;
  last_update date;
  current_user_id uuid := auth.uid();
BEGIN
SELECT
    (last_credit_update_at AT TIME ZONE 'utc')::date,
    p.image_credits
INTO
    last_update,
    current_credits
FROM
    public.profiles p
WHERE
    p.id = current_user_id;

IF last_update IS NULL THEN
    RETURN 30;
END IF;

  IF last_update < (now() AT TIME ZONE 'utc')::date THEN
UPDATE public.profiles
SET
    image_credits = 30,
    last_credit_update_at = now()
WHERE
    id = current_user_id
    RETURNING
      image_credits INTO current_credits;
END IF;

RETURN current_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reset_and_get_image_credits() TO authenticated;

COMMENT ON FUNCTION public.reset_and_get_image_credits() IS 'Checks if the user''s image credits need to be reset based on the last update date (UTC). If a day has passed, it resets credits to 30 and updates the timestamp. It then returns the current credit count.';