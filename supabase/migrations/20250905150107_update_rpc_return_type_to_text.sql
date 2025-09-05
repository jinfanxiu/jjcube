-- 1. 기존 함수를 먼저 삭제합니다.
DROP FUNCTION IF EXISTS public.get_next_record(text);

-- 2. url의 반환 타입이 text로 수정된 새로운 함수를 생성합니다.
CREATE OR REPLACE FUNCTION public.get_next_record(p_table_identifier TEXT)
RETURNS TABLE(
    id bigint,
    created_at timestamp with time zone,
    url text,
    title text,
    content text,
    comments text
)
LANGUAGE plpgsql
AS $$
DECLARE
last_id bigint;
    next_record RECORD;
BEGIN
SELECT last_processed_article_id INTO last_id
FROM public.sequence_tracker
WHERE table_identifier = p_table_identifier
    FOR UPDATE;

EXECUTE format('SELECT * FROM public.%I WHERE id > %L ORDER BY id ASC LIMIT 1', p_table_identifier, last_id)
    INTO next_record;

IF next_record IS NULL THEN
UPDATE public.sequence_tracker
SET last_processed_article_id = 0
WHERE table_identifier = p_table_identifier;

EXECUTE format('SELECT * FROM public.%I WHERE id > 0 ORDER BY id ASC LIMIT 1', p_table_identifier)
    INTO next_record;
END IF;

    IF next_record IS NOT NULL THEN
UPDATE public.sequence_tracker
SET last_processed_article_id = next_record.id
WHERE table_identifier = p_table_identifier;

RETURN QUERY SELECT
            next_record.id,
            next_record.created_at,
            next_record.url,
            next_record.title,
            next_record.content,
            next_record.comments;
END IF;

    RETURN;
END;
$$;