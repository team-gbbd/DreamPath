-- inquiry 테이블에 answered 관련 컬럼 추가
ALTER TABLE inquiry ADD COLUMN IF NOT EXISTS answered BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE inquiry ADD COLUMN IF NOT EXISTS answered_at TIMESTAMP;
ALTER TABLE inquiry ADD COLUMN IF NOT EXISTS reply_content TEXT;

-- 기존 데이터는 모두 미답변 상태로 설정
UPDATE inquiry SET answered = false WHERE answered IS NULL;
