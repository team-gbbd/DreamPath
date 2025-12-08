-- 사용자별 채용공고 추천 캐시 테이블
-- 백그라운드에서 미리 계산된 추천 결과를 저장하여 빠른 응답 제공
CREATE TABLE IF NOT EXISTS user_job_recommendations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '사용자 ID',
    job_listing_id BIGINT NOT NULL COMMENT '채용공고 ID',
    match_score DECIMAL(5,2) DEFAULT 0.00 COMMENT '매칭 점수 (0-100)',
    match_reason TEXT COMMENT '추천 이유 (AI 생성)',
    recommendation_data JSON COMMENT '추가 추천 정보 (JSON)',
    calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '계산 시간',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시간',

    -- 인덱스
    INDEX idx_user_id (user_id),
    INDEX idx_job_listing_id (job_listing_id),
    INDEX idx_calculated_at (calculated_at),
    INDEX idx_match_score (match_score),
    INDEX idx_user_score (user_id, match_score DESC),

    -- 중복 방지: 같은 사용자에게 같은 공고는 한 번만 추천
    UNIQUE KEY uk_user_job (user_id, job_listing_id)

    -- 외래키는 환경에 따라 선택적으로 추가 가능
    -- FOREIGN KEY (job_listing_id) REFERENCES job_listings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자별 채용공고 추천 캐시';

-- PostgreSQL 버전 (선택적)
-- CREATE TABLE IF NOT EXISTS user_job_recommendations (
--     id BIGSERIAL PRIMARY KEY,
--     user_id BIGINT NOT NULL,
--     job_listing_id BIGINT NOT NULL,
--     match_score DECIMAL(5,2) DEFAULT 0.00,
--     match_reason TEXT,
--     recommendation_data JSONB,
--     calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--
--     UNIQUE (user_id, job_listing_id)
-- );
--
-- CREATE INDEX IF NOT EXISTS idx_ujr_user_id ON user_job_recommendations (user_id);
-- CREATE INDEX IF NOT EXISTS idx_ujr_job_listing_id ON user_job_recommendations (job_listing_id);
-- CREATE INDEX IF NOT EXISTS idx_ujr_calculated_at ON user_job_recommendations (calculated_at);
-- CREATE INDEX IF NOT EXISTS idx_ujr_match_score ON user_job_recommendations (match_score);
-- CREATE INDEX IF NOT EXISTS idx_ujr_user_score ON user_job_recommendations (user_id, match_score DESC);
