CREATE OR REPLACE FUNCTION public.get_next_article_and_update_tracker()
RETURNS SETOF articles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
last_id bigint;
    next_article articles%ROWTYPE;
BEGIN
    -- 1. 마지막 처리 ID를 잠금과 함께 가져옵니다.
SELECT last_processed_article_id INTO last_id
FROM public.sequence_tracker WHERE id = 1 FOR UPDATE;

-- 2. 다음 게시글을 찾습니다.
SELECT * INTO next_article
FROM public.articles
WHERE id > last_id ORDER BY id ASC LIMIT 1;

-- 3. 만약 다음 게시글을 찾지 못했다면 (즉, 끝까지 다 읽었다면)
IF NOT FOUND THEN
        -- 3-1. tracker를 0으로 리셋합니다.
UPDATE public.sequence_tracker SET last_processed_article_id = 0 WHERE id = 1;

-- 3-2. 처음부터 다시 다음 게시글을 찾습니다. (id > 0)
SELECT * INTO next_article
FROM public.articles
WHERE id > 0 ORDER BY id ASC LIMIT 1;
END IF;

    -- 4. (어떤 경우든) 최종적으로 찾은 게시글이 있다면 tracker를 업데이트하고 반환합니다.
    IF FOUND THEN
UPDATE public.sequence_tracker
SET last_processed_article_id = next_article.id
WHERE id = 1;

RETURN NEXT next_article;
END IF;

    RETURN;
END;
$$;