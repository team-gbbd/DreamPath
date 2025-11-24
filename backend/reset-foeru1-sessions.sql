-- foeru1 사용자의 이용권을 0개로 초기화

UPDATE users
SET remaining_sessions = 0
WHERE username = 'foeru1';

-- 확인
SELECT user_id, username, name, remaining_sessions
FROM users
WHERE username = 'foeru1';
