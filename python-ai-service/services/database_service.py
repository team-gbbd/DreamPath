"""
데이터베이스 서비스
MySQL 데이터베이스 연결 및 채용 공고 저장/조회 기능
"""
import os
from typing import List, Dict, Optional
from datetime import datetime
import pymysql
from pymysql.cursors import DictCursor
from contextlib import contextmanager


class DatabaseService:
    """데이터베이스 서비스"""
    
    def __init__(self):
        """데이터베이스 연결 정보 초기화"""
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
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM information_schema.tables
                    WHERE table_schema = %s AND table_name = 'job_listings'
                """, (self.db_config['database'],))
                
                result = cursor.fetchone()
                if result['count'] == 0:
                    # 테이블 생성 SQL 읽기
                    sql_file = os.path.join(
                        os.path.dirname(__file__),
                        '..',
                        'db',
                        'migrations',
                        '001_create_job_listings_table.sql'
                    )
                    
                    if os.path.exists(sql_file):
                        with open(sql_file, 'r', encoding='utf-8') as f:
                            create_sql = f.read()
                            # 주석 제거 및 SQL 실행
                            sql_statements = [
                                s.strip() for s in create_sql.split(';')
                                if s.strip() and not s.strip().startswith('--')
                            ]
                            for sql in sql_statements:
                                if sql:
                                    cursor.execute(sql)
                        conn.commit()
                        print("job_listings 테이블이 생성되었습니다.")
                    else:
                        # SQL 파일이 없으면 직접 생성
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
                    ON DUPLICATE KEY UPDATE
                        title = VALUES(title),
                        company = VALUES(company),
                        location = VALUES(location),
                        description = VALUES(description),
                        url = VALUES(url),
                        reward = VALUES(reward),
                        experience = VALUES(experience),
                        search_keyword = VALUES(search_keyword),
                        updated_at = CURRENT_TIMESTAMP
                """
                
                for job in job_listings:
                    try:
                        job_id = job.get("id") or job.get("job_id") or None
                        title = job.get("title") or "채용 공고"
                        url = job.get("url") or site_url
                        
                        # job_id가 없으면 URL에서 추출 시도
                        if not job_id and url:
                            # URL에서 ID 추출 (예: /wd/12345 -> 12345)
                            import re
                            match = re.search(r'/(\d+)(?:[/?#]|$)', url)
                            if match:
                                job_id = match.group(1)
                        
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
                        
                        cursor.execute(insert_sql, (
                            site_name,
                            site_url,
                            job_id,
                            title,
                            job.get("company"),
                            job.get("location"),
                            job.get("description"),
                            url,
                            reward,
                            experience,
                            search_keyword,
                            datetime.now()
                        ))
                        saved_count += 1
                    except Exception as e:
                        print(f"채용 공고 저장 실패: {job}, 에러: {str(e)}")
                        continue
                
                conn.commit()
                print(f"{saved_count}개의 채용 공고가 데이터베이스에 저장되었습니다.")
                
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

