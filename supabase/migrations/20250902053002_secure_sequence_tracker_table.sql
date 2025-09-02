-- 1. sequence_tracker 테이블에 Row Level Security (RLS)를 활성화합니다.
-- 이 설정은 정책이 없는 모든 접근을 기본적으로 차단합니다.
ALTER TABLE public.sequence_tracker ENABLE ROW LEVEL SECURITY;

-- 2. 서비스 키(service_role)를 사용하는 요청에 대해서만 모든 작업(SELECT, INSERT, UPDATE, DELETE)을 허용하는 정책을 생성합니다.
-- 이렇게 하면 외부 클라이언트에서는 이 테이블에 접근할 수 없게 됩니다.
CREATE POLICY "Enable full access for service_role only"
ON public.sequence_tracker
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);