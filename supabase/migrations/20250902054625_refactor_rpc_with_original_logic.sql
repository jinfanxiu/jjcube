-- 1. sequence_tracker 테이블 구조를 여러 테이블을 추적할 수 있도록 변경합니다.
-- 기존 기본 키 제약 조건을 삭제합니다.
ALTER TABLE public.sequence_tracker DROP CONSTRAINT IF EXISTS sequence_tracker_pkey;

-- 어떤 테이블을 추적하는지 식별하는 컬럼을 추가합니다. (이미 있다면 무시)
ALTER TABLE public.sequence_tracker
    ADD COLUMN IF NOT EXISTS table_identifier TEXT NOT NULL DEFAULT 'articles';

-- 기존 행의 식별자를 'articles'로 명시적으로 업데이트합니다.
UPDATE public.sequence_tracker SET table_identifier = 'articles' WHERE id = 1;

-- ★★★ 수정된 부분 ★★★
-- 2. table_identifier를 새로운 기본 키로 먼저 설정합니다.
ALTER TABLE public.sequence_tracker
    ADD PRIMARY KEY (table_identifier);

-- 3. 이제 Primary Key가 존재하므로 ON CONFLICT 구문이 정상적으로 작동합니다.
-- certificate_reviews 테이블을 위한 새로운 추적 행을 추가합니다.
INSERT INTO public.sequence_tracker(last_processed_article_id, table_identifier)
VALUES (0, 'certificate_reviews')
    ON CONFLICT (table_identifier) DO NOTHING;

-- 4. 더 이상 필요 없는 기존 id 컬럼을 삭제합니다.
ALTER TABLE public.sequence_tracker
DROP COLUMN IF EXISTS id;


-- 5. 기존 함수를 삭제하고, 핵심 로직을 보존한 새로운 범용 함수를 생성합니다.
DROP FUNCTION IF EXISTS public.get_next_article_and_update_tracker();

CREATE OR REPLACE FUNCTION public.get_next_record(p_table_identifier TEXT)
-- 반환 타입을 articles 또는 certificate_reviews 테이블과 동일한 구조로 정의합니다.
RETURNS TABLE(
    id bigint,
    created_at timestamp with time zone,
    url character varying,
    title text,
    content text,
    comments text
)
LANGUAGE plpgsql
AS $$
DECLARE
last_id bigint;
    next_record RECORD; -- 특정 테이블 타입이 아닌 일반 레코드 타입으로 선언
BEGIN
    -- 1. 파라미터로 받은 테이블 식별자를 사용하여 마지막 처리 ID를 가져옵니다. (기존 로직 동일)
SELECT last_processed_article_id INTO last_id
FROM public.sequence_tracker
WHERE table_identifier = p_table_identifier
    FOR UPDATE;

-- 2. 다음 레코드를 동적으로 찾습니다. (기존 로직 동일)
-- format()과 %I를 사용하여 테이블 이름을 안전하게 쿼리에 삽입합니다.
EXECUTE format('SELECT * FROM public.%I WHERE id > %L ORDER BY id ASC LIMIT 1', p_table_identifier, last_id)
    INTO next_record;

-- 3. 다음 레코드를 찾지 못했다면 (순환 로직 시작) (기존 로직 동일)
IF next_record IS NULL THEN
        -- 3-1. tracker를 0으로 리셋합니다.
UPDATE public.sequence_tracker
SET last_processed_article_id = 0
WHERE table_identifier = p_table_identifier;

-- 3-2. 처음부터 다시 다음 레코드를 찾습니다.
EXECUTE format('SELECT * FROM public.%I WHERE id > 0 ORDER BY id ASC LIMIT 1', p_table_identifier)
    INTO next_record;
END IF;

    -- 4. 최종적으로 찾은 레코드가 있다면 tracker를 업데이트하고 결과를 반환합니다. (기존 로직 동일)
    IF next_record IS NOT NULL THEN
UPDATE public.sequence_tracker
SET last_processed_article_id = next_record.id
WHERE table_identifier = p_table_identifier;

-- RETURNS TABLE의 구조에 맞춰 명시적으로 컬럼을 반환합니다.
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