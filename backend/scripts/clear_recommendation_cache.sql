-- Option 3: 캐시 무효화 스크립트
-- 이 스크립트는 기존의 잘못된 캐시 데이터를 삭제합니다.

-- 1. 현재 캐시 상태 확인
SELECT 
    'job_recommendations' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN match_score = 0.0 THEN 1 END) as zero_score_count,
    COUNT(CASE WHEN match_score > 0.0 THEN 1 END) as valid_score_count
FROM job_recommendations
UNION ALL
SELECT 
    'major_recommendations' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN match_score = 0.0 THEN 1 END) as zero_score_count,
    COUNT(CASE WHEN match_score > 0.0 THEN 1 END) as valid_score_count
FROM major_recommendations;

-- 2. 샘플 데이터 확인 (matchScore가 0인 레코드)
SELECT id, user_id, job_name, match_score, created_at
FROM job_recommendations
WHERE match_score = 0.0
LIMIT 5;

SELECT id, user_id, major_name, match_score, created_at
FROM major_recommendations
WHERE match_score = 0.0
LIMIT 5;

-- 3. 캐시 삭제 (주석 해제하여 실행)
-- DELETE FROM job_recommendations;
-- DELETE FROM major_recommendations;

-- 4. 삭제 후 확인
-- SELECT COUNT(*) as remaining_jobs FROM job_recommendations;
-- SELECT COUNT(*) as remaining_majors FROM major_recommendations;
