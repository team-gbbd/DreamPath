-- 채용 공고 테이블 생성
CREATE TABLE IF NOT EXISTS job_listings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    site_name VARCHAR(100) NOT NULL COMMENT '사이트 이름 (원티드, 잡코리아 등)',
    site_url VARCHAR(500) NOT NULL COMMENT '사이트 URL',
    job_id VARCHAR(255) COMMENT '사이트별 채용 공고 ID',
    title VARCHAR(500) NOT NULL COMMENT '채용 공고 제목',
    company VARCHAR(255) COMMENT '회사명',
    location VARCHAR(255) COMMENT '근무지역',
    description TEXT COMMENT '채용 공고 설명',
    url VARCHAR(1000) NOT NULL COMMENT '채용 공고 URL',
    reward VARCHAR(255) COMMENT '보상금/급여',
    experience VARCHAR(255) COMMENT '경력 요구사항',
    search_keyword VARCHAR(255) COMMENT '검색 키워드',
    crawled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '크롤링 시간',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시간',
    
    -- 인덱스
    INDEX idx_site_name (site_name),
    INDEX idx_search_keyword (search_keyword),
    INDEX idx_company (company),
    INDEX idx_crawled_at (crawled_at),
    INDEX idx_site_job_id (site_name, job_id),
    
    -- 중복 방지: 같은 사이트의 같은 job_id는 한 번만 저장
    UNIQUE KEY uk_site_job_id (site_name, job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채용 공고 정보';

