"""
데이터베이스 서비스
MySQL/PostgreSQL 데이터베이스 연결 및 채용 공고 저장/조회 기능
"""
import os
from typing import List, Dict, Optional
from datetime import datetime
from contextlib import contextmanager

# DB 타입에 따라 다른 드라이버 사용
DB_TYPE = os.getenv('DB_TYPE', 'mysql').lower()

if DB_TYPE == 'postgres' or DB_TYPE == 'postgresql':
    import psycopg2
    from psycopg2.extras import RealDictCursor
    USE_POSTGRES = True
else:
    import pymysql
    from pymysql.cursors import DictCursor
    USE_POSTGRES = False


class DatabaseService:
    """데이터베이스 서비스"""
    
    def __init__(self):
        """데이터베이스 연결 정보 초기화"""
        if USE_POSTGRES:
            self.db_config = {
                'host': os.getenv('DB_HOST', 'localhost'),
                'port': int(os.getenv('DB_PORT', 5432)),
                'user': os.getenv('DB_USER', 'postgres'),
                'password': os.getenv('DB_PASSWORD', 'postgres'),
                'database': os.getenv('DB_NAME', 'postgres'),
                'sslmode': os.getenv('DB_SSLMODE', 'prefer'),
                'cursor_factory': RealDictCursor
            }
        else:
            self.db_config = {
                'host': os.getenv('DB_HOST', 'db'),
                'port': int(os.getenv('DB_PORT', 3306)),
                'user': os.getenv('DB_USER', 'dreamuser'),
                'password': os.getenv('DB_PASSWORD', 'dreampass'),
                'database': os.getenv('DB_NAME', 'dreampath'),
                'charset': 'utf8mb4',
                'cursorclass': DictCursor,
                'autocommit': False
            }
        self._ensure_table_exists()
    
    @contextmanager
    def get_connection(self):
        """데이터베이스 연결 컨텍스트 매니저"""
        conn = None
        try:
            if USE_POSTGRES:
                conn = psycopg2.connect(**self.db_config)
            else:
                conn = pymysql.connect(**self.db_config)
            yield conn
            conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            raise e
        finally:
            if conn:
                conn.close()
    
    def _ensure_table_exists(self):
        """테이블이 존재하는지 확인하고 없으면 생성"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # 테이블 존재 여부 확인
                if USE_POSTGRES:
                    cursor.execute("""
                        SELECT COUNT(*) as count
                        FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = 'job_listings'
                    """)
                else:
                    cursor.execute("""
                        SELECT COUNT(*) as count
                        FROM information_schema.tables
                        WHERE table_schema = %s AND table_name = 'job_listings'
                    """, (self.db_config['database'],))
                
                result = cursor.fetchone()
                if result['count'] == 0:
                    # PostgreSQL과 MySQL 각각 테이블 생성
                    if USE_POSTGRES:
                        # PostgreSQL 전용 테이블 생성
                        cursor.execute("""
                            CREATE TABLE IF NOT EXISTS job_listings (
                                id BIGSERIAL PRIMARY KEY,
                                site_name VARCHAR(100) NOT NULL,
                                site_url VARCHAR(500) NOT NULL,
                                job_id VARCHAR(255),
                                title VARCHAR(500) NOT NULL,
                                company VARCHAR(255),
                                location VARCHAR(255),
                                description TEXT,
                                url VARCHAR(1000) NOT NULL,
                                reward VARCHAR(255),
                                experience VARCHAR(255),
                                search_keyword VARCHAR(255),
                                crawled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                UNIQUE (site_name, job_id)
                            )
                        """)
                        cursor.execute("CREATE INDEX IF NOT EXISTS idx_site_name ON job_listings (site_name)")
                        cursor.execute("CREATE INDEX IF NOT EXISTS idx_search_keyword ON job_listings (search_keyword)")
                        cursor.execute("CREATE INDEX IF NOT EXISTS idx_company ON job_listings (company)")
                        cursor.execute("CREATE INDEX IF NOT EXISTS idx_crawled_at ON job_listings (crawled_at)")
                        cursor.execute("CREATE INDEX IF NOT EXISTS idx_site_job_id ON job_listings (site_name, job_id)")
                    else:
                        # MySQL 전용 테이블 생성
                        cursor.execute("""
                            CREATE TABLE IF NOT EXISTS job_listings (
                                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                site_name VARCHAR(100) NOT NULL COMMENT '사이트 이름',
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
                                INDEX idx_site_name (site_name),
                                INDEX idx_search_keyword (search_keyword),
                                INDEX idx_company (company),
                                INDEX idx_crawled_at (crawled_at),
                                INDEX idx_site_job_id (site_name, job_id),
                                UNIQUE KEY uk_site_job_id (site_name, job_id)
                            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채용 공고 정보'
                        """)
                    conn.commit()
                    print("job_listings 테이블이 생성되었습니다.")
        except Exception as e:
            print(f"테이블 생성 확인 중 오류 발생: {str(e)}")
            # 테이블 생성 실패해도 계속 진행 (이미 존재할 수 있음)
    
    def save_job_listings(
        self,
        site_name: str,
        site_url: str,
        job_listings: List[Dict],
        search_keyword: Optional[str] = None
    ) -> int:
        """
        채용 공고를 데이터베이스에 저장합니다.
        중복된 공고는 무시됩니다 (UNIQUE 제약).
        
        Args:
            site_name: 사이트 이름
            site_url: 사이트 URL
            job_listings: 채용 공고 리스트
            search_keyword: 검색 키워드 (선택)
        
        Returns:
            저장된 공고 수
        """
        if not job_listings:
            return 0
        
        saved_count = 0
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # 1단계: 모든 job_id를 한 번에 추출
                job_ids_to_check = []
                job_data_map = {}  # job_id -> job data
                
                for job in job_listings:
                    job_id = job.get("id") or job.get("job_id") or None
                    url = job.get("url") or site_url
                    
                    # job_id가 없으면 URL에서 추출 시도
                    if not job_id and url:
                        import re
                        match = re.search(r'/(\d+)(?:[/?#]|$)', url)
                        if match:
                            job_id = match.group(1)
                    
                    if job_id:
                        job_ids_to_check.append(str(job_id))
                        job_data_map[str(job_id)] = job
                
                # 2단계: 배치로 중복 체크 (IN 절 사용)
                existing_job_ids = set()
                if job_ids_to_check:
                    placeholders = ','.join(['%s'] * len(job_ids_to_check))
                    check_sql = f"""
                        SELECT job_id FROM job_listings 
                        WHERE site_name = %s AND job_id IN ({placeholders})
                    """
                    cursor.execute(check_sql, [site_name] + job_ids_to_check)
                    existing_job_ids = {row['job_id'] for row in cursor.fetchall()}
                
                # 3단계: 새 공고만 INSERT
                insert_sql = """
                    INSERT INTO job_listings (
                        site_name, site_url, job_id, title, company,
                        location, description, url, reward, experience,
                        search_keyword, crawled_at
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s
                    )
                """
                
                skipped_count = len(existing_job_ids)
                
                for job in job_listings:
                    try:
                        job_id = job.get("id") or job.get("job_id") or None
                        title = job.get("title") or "채용 공고"
                        url = job.get("url") or site_url
                        
                        # job_id가 없으면 URL에서 추출 시도
                        if not job_id and url:
                            import re
                            match = re.search(r'/(\d+)(?:[/?#]|$)', url)
                            if match:
                                job_id = match.group(1)
                        
                        # 이미 존재하는 공고는 건너뛰기
                        if job_id and str(job_id) in existing_job_ids:
                            continue
                        
                        # reward가 딕셔너리인 경우 문자열로 변환
                        reward = job.get("reward")
                        if isinstance(reward, dict):
                            reward = reward.get("formatted_total") or reward.get("formatted_recommender") or str(reward)
                        elif reward is not None:
                            reward = str(reward)
                        
                        # experience도 문자열로 변환
                        experience = job.get("experience")
                        if experience is not None:
                            experience = str(experience)
                        
                        # company가 None이면 빈 문자열로 처리
                        company = job.get("company") or ""
                        
                        cursor.execute(insert_sql, (
                            site_name,
                            site_url,
                            job_id,
                            title,
                            company,
                            job.get("location"),
                            job.get("description"),
                            url,
                            reward,
                            experience,
                            search_keyword,
                            datetime.now()
                        ))
                        conn.commit()  # 각 INSERT 후 즉시 커밋
                        saved_count += 1
                    except Exception as e:
                        conn.rollback()  # 에러 발생 시 rollback
                        print(f"채용 공고 저장 실패: {job}, 에러: {str(e)}")
                        continue
                print(f"[DEBUG] Commit completed. Saved={saved_count}, Skipped={skipped_count}")
                print(f"[DEBUG] Connected to: {self.db_config['host']}, DB: {self.db_config['database']}")
                if saved_count > 0:
                    print(f"{saved_count}개의 새로운 채용 공고가 데이터베이스에 저장되었습니다.")
                if skipped_count > 0:
                    print(f"{skipped_count}개의 채용 공고는 이미 존재하여 건너뛰었습니다.")
                
        except Exception as e:
            print(f"데이터베이스 저장 중 오류 발생: {str(e)}")
            raise e
        
        return saved_count
    
    def get_job_listings(
        self,
        site_name: Optional[str] = None,
        search_keyword: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict]:
        """
        데이터베이스에서 채용 공고를 조회합니다.
        
        Args:
            site_name: 사이트 이름 필터 (선택)
            search_keyword: 검색 키워드 필터 (선택)
            limit: 최대 결과 수
            offset: 오프셋
        
        Returns:
            채용 공고 리스트
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                where_clauses = []
                params = []
                
                if site_name:
                    where_clauses.append("site_name = %s")
                    params.append(site_name)
                
                if search_keyword:
                    where_clauses.append("(search_keyword LIKE %s OR title LIKE %s OR company LIKE %s)")
                    keyword_pattern = f"%{search_keyword}%"
                    params.extend([keyword_pattern, keyword_pattern, keyword_pattern])
                
                where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
                
                query = f"""
                    SELECT 
                        id, site_name, site_url, job_id, title, company,
                        location, description, url, reward, experience,
                        search_keyword, crawled_at, created_at, updated_at
                    FROM job_listings
                    {where_sql}
                    ORDER BY crawled_at DESC
                    LIMIT %s OFFSET %s
                """
                
                params.extend([limit, offset])
                cursor.execute(query, params)
                
                results = cursor.fetchall()
                
                # DictCursor를 사용하므로 이미 딕셔너리 형태
                return list(results)
                
        except Exception as e:
            print(f"데이터베이스 조회 중 오류 발생: {str(e)}")
            return []
    
    def count_job_listings(
        self,
        site_name: Optional[str] = None,
        search_keyword: Optional[str] = None
    ) -> int:
        """
        채용 공고 개수를 조회합니다.
        
        Args:
            site_name: 사이트 이름 필터 (선택)
            search_keyword: 검색 키워드 필터 (선택)
        
        Returns:
            채용 공고 개수
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                where_clauses = []
                params = []
                
                if site_name:
                    where_clauses.append("site_name = %s")
                    params.append(site_name)
                
                if search_keyword:
                    where_clauses.append("(search_keyword LIKE %s OR title LIKE %s OR company LIKE %s)")
                    keyword_pattern = f"%{search_keyword}%"
                    params.extend([keyword_pattern, keyword_pattern, keyword_pattern])
                
                where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
                
                query = f"SELECT COUNT(*) as count FROM job_listings {where_sql}"
                cursor.execute(query, params)
                
                result = cursor.fetchone()
                return result['count'] if result else 0
                
        except Exception as e:
            print(f"데이터베이스 카운트 조회 중 오류 발생: {str(e)}")
            return 0

