-- sequence_tracker 테이블 생성
CREATE TABLE public.sequence_tracker (
                                         id bigint PRIMARY KEY DEFAULT 1,
                                         last_processed_article_id bigint DEFAULT 0,
                                         CONSTRAINT sequence_tracker_id_check CHECK (id = 1)
);

COMMENT ON TABLE public.sequence_tracker IS '순차적 스크래핑 시 마지막으로 처리된 게시글 ID 추적';

-- sequence_tracker 테이블에 초기값 삽입 (존재하지 않을 경우에만)
INSERT INTO public.sequence_tracker (id, last_processed_article_id)
VALUES (1, 0)
    ON CONFLICT (id) DO NOTHING;