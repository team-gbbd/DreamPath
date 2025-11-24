ALTER TABLE users
ADD COLUMN IF NOT EXISTS remaining_sessions INTEGER DEFAULT 0 NOT NULL;

-- 기존 NULL 값들을 0으로 업데이트
UPDATE users
SET remaining_sessions = 0
WHERE remaining_sessions IS NULL;
