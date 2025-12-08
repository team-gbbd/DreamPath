-- user_job_recommendations 테이블 생성
-- AI가 계산한 사용자별 채용공고 추천 결과를 저장

CREATE TABLE IF NOT EXISTS user_job_recommendations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    job_listing_id BIGINT NOT NULL,
    match_score DECIMAL(5,2) DEFAULT 0,
    match_reason TEXT,
    recommendation_data JSONB,
    calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 유니크 제약: 사용자-채용공고 조합은 하나만 존재
    UNIQUE (user_id, job_listing_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ujr_user_id ON user_job_recommendations (user_id);
CREATE INDEX IF NOT EXISTS idx_ujr_job_listing_id ON user_job_recommendations (job_listing_id);
CREATE INDEX IF NOT EXISTS idx_ujr_match_score ON user_job_recommendations (match_score DESC);
CREATE INDEX IF NOT EXISTS idx_ujr_calculated_at ON user_job_recommendations (calculated_at DESC);

-- 코멘트 추가
COMMENT ON TABLE user_job_recommendations IS 'AI가 계산한 사용자별 채용공고 추천 결과';
COMMENT ON COLUMN user_job_recommendations.user_id IS '사용자 ID';
COMMENT ON COLUMN user_job_recommendations.job_listing_id IS '채용공고 ID (job_listings.id 참조)';
COMMENT ON COLUMN user_job_recommendations.match_score IS '매칭 점수 (0-100)';
COMMENT ON COLUMN user_job_recommendations.match_reason IS '매칭 이유 요약';
COMMENT ON COLUMN user_job_recommendations.recommendation_data IS '전체 추천 데이터 (JSON)';
COMMENT ON COLUMN user_job_recommendations.calculated_at IS '추천 계산 시간';
