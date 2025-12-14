-- 사용자별 프로파일 기반 직업 추천 저장 테이블
-- Pinecone 벡터 검색 결과 (CareerNet 직업 정보)를 저장

-- PostgreSQL 버전
CREATE TABLE IF NOT EXISTS user_profile_recommendations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    job_id VARCHAR(255) NOT NULL,
    job_name VARCHAR(500),
    match_score DECIMAL(5,4) DEFAULT 0.0000,
    summary TEXT,
    wage VARCHAR(255),
    wlb VARCHAR(255),
    aptitude TEXT,
    ability TEXT,
    related_job TEXT,
    metadata JSONB,
    calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_upr_user_id ON user_profile_recommendations (user_id);
CREATE INDEX IF NOT EXISTS idx_upr_job_id ON user_profile_recommendations (job_id);
CREATE INDEX IF NOT EXISTS idx_upr_match_score ON user_profile_recommendations (match_score DESC);
CREATE INDEX IF NOT EXISTS idx_upr_user_score ON user_profile_recommendations (user_id, match_score DESC);
