"""
데이터베이스 서비스
MySQL/PostgreSQL 데이터베이스 연결 및 채용 공고 저장/조회 기능
"""
import os
import json
import threading
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
                'port': int(os.getenv('DB_PORT', 6543)),
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

        # self._ensure_table_exists()
        self._local = threading.local()
        self._connection_lock = threading.Lock()

        # CareerNet 재수집을 위해 테이블 생성이 필요하므로 일시적으로 활성화
        try:
             with self.get_connection() as conn:
                 self._ensure_job_details_table(conn)
        except Exception as e:
             # Already printed inside or negligible if connection fails here (will fail later)
             print(f"Table creation check error: {e}")

    def cleanup(self):
        """연결 정리용 스텁"""
        conn = getattr(self._local, "connection", None)
        if conn:
            try:
                conn.close()
            except Exception:
                pass
            finally:
                self._local.connection = None
    
    def _create_connection(self):
        """새로운 데이터베이스 연결 생성"""
        if USE_POSTGRES:
            return psycopg2.connect(**self.db_config)
        return pymysql.connect(**self.db_config)

    def _is_connection_alive(self, conn) -> bool:
        """현재 연결이 유효한지 확인"""
        if not conn:
            return False
        try:
            if USE_POSTGRES:
                # conn.closed만으로는 서버에서 끊어진 연결을 감지 못함
                # 실제 쿼리를 실행하여 연결 상태 확인
                if conn.closed != 0:
                    return False
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.fetchone()  # 결과를 소비해서 버퍼 비우기
                cursor.close()
                return True
            # pymysql은 ping으로 상태 확인 (자동 재연결)
            conn.ping(reconnect=True)
            return True
        except Exception:
            return False

    def _get_or_create_connection(self):
        """스레드별 연결 재사용"""
        conn = getattr(self._local, "connection", None)
        if self._is_connection_alive(conn):
            return conn

        with self._connection_lock:
            conn = getattr(self._local, "connection", None)
            if not self._is_connection_alive(conn):
                conn = self._create_connection()
                self._local.connection = conn
        return conn

    @contextmanager
    def get_connection(self):
        """데이터베이스 연결 컨텍스트 매니저"""
        conn = self._get_or_create_connection()
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
    
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

                # company_info 테이블 생성
                self._ensure_company_info_table(conn)
                
                # job_details 테이블 생성
                self._ensure_job_details_table(conn)
                

                # major_details 테이블 생성
                self._ensure_major_details_table(conn)

                # career_analyses & job_recommendations 테이블 생성
                self._ensure_career_analysis_tables(conn)
        except Exception as e:
            print(f"테이블 생성 확인 중 오류 발생: {str(e)}")
            # 테이블 생성 실패해도 계속 진행 (이미 존재할 수 있음)

    def _ensure_company_info_table(self, conn):
        """company_info 테이블 생성"""
        try:
            cursor = conn.cursor()

            # 테이블 존재 여부 확인
            if USE_POSTGRES:
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'company_info'
                """)
            else:
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM information_schema.tables
                    WHERE table_schema = %s AND table_name = 'company_info'
                """, (self.db_config['database'],))

            result = cursor.fetchone()
            if result['count'] == 0:
                if USE_POSTGRES:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS company_info (
                            id BIGSERIAL PRIMARY KEY,
                            site_name VARCHAR(100) NOT NULL,
                            company_id VARCHAR(255),
                            company_name VARCHAR(255) NOT NULL,
                            industry VARCHAR(255),
                            established_year VARCHAR(50),
                            employee_count VARCHAR(100),
                            location VARCHAR(500),
                            address TEXT,
                            description TEXT,
                            vision TEXT,
                            benefits TEXT,
                            culture TEXT,
                            average_salary VARCHAR(100),
                            company_type VARCHAR(100),
                            revenue VARCHAR(100),
                            ceo_name VARCHAR(100),
                            capital VARCHAR(100),
                            homepage_url VARCHAR(1000),
                            recruitment_url VARCHAR(1000),
                            logo_url VARCHAR(1000),
                            crawled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            UNIQUE (site_name, company_id)
                        )
                    """)
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_site_name ON company_info (site_name)")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_name ON company_info (company_name)")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_industry ON company_info (industry)")
                else:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS company_info (
                            id BIGINT AUTO_INCREMENT PRIMARY KEY,
                            site_name VARCHAR(100) NOT NULL COMMENT '사이트 이름',
                            company_id VARCHAR(255) COMMENT '사이트별 기업 ID',
                            company_name VARCHAR(255) NOT NULL COMMENT '회사명',
                            industry VARCHAR(255) COMMENT '업종',
                            established_year VARCHAR(50) COMMENT '설립연도',
                            employee_count VARCHAR(100) COMMENT '직원수',
                            location VARCHAR(500) COMMENT '위치',
                            address TEXT COMMENT '주소',
                            description TEXT COMMENT '회사 설명',
                            vision TEXT COMMENT '비전/미션',
                            benefits TEXT COMMENT '복지/혜택',
                            culture TEXT COMMENT '기업문화',
                            average_salary VARCHAR(100) COMMENT '평균 연봉',
                            company_type VARCHAR(100) COMMENT '기업구분',
                            revenue VARCHAR(100) COMMENT '매출액',
                            ceo_name VARCHAR(100) COMMENT '대표자',
                            capital VARCHAR(100) COMMENT '자본금',
                            homepage_url VARCHAR(1000) COMMENT '홈페이지',
                            recruitment_url VARCHAR(1000) COMMENT '채용 페이지',
                            logo_url VARCHAR(1000) COMMENT '로고 URL',
                            crawled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '크롤링 시간',
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시간',
                            INDEX idx_company_site_name (site_name),
                            INDEX idx_company_name (company_name),
                            INDEX idx_company_industry (industry),
                            UNIQUE KEY uk_site_company_id (site_name, company_id)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='기업 정보'
                    """)
                conn.commit()
                print("company_info 테이블이 생성되었습니다.")
            else:
                # 테이블이 이미 존재하는 경우, 새 컬럼 추가 (ALTER TABLE)
                print("company_info 테이블이 이미 존재합니다. 새 컬럼을 추가합니다...")
                if USE_POSTGRES:
                    # PostgreSQL: ADD COLUMN IF NOT EXISTS
                    try:
                        cursor.execute("ALTER TABLE company_info ADD COLUMN IF NOT EXISTS company_type VARCHAR(100)")
                        cursor.execute("ALTER TABLE company_info ADD COLUMN IF NOT EXISTS revenue VARCHAR(100)")
                        cursor.execute("ALTER TABLE company_info ADD COLUMN IF NOT EXISTS ceo_name VARCHAR(100)")
                        cursor.execute("ALTER TABLE company_info ADD COLUMN IF NOT EXISTS capital VARCHAR(100)")
                        conn.commit()
                        print("✓ 새 컬럼 추가 완료 (company_type, revenue, ceo_name, capital)")
                    except Exception as alter_error:
                        print(f"컬럼 추가 중 오류 (무시 가능): {str(alter_error)}")
                else:
                    # MySQL: 컬럼 존재 여부 확인 후 추가
                    new_columns = [
                        ("company_type", "VARCHAR(100) COMMENT '기업구분'"),
                        ("revenue", "VARCHAR(100) COMMENT '매출액'"),
                        ("ceo_name", "VARCHAR(100) COMMENT '대표자'"),
                        ("capital", "VARCHAR(100) COMMENT '자본금'"),
                    ]
                    for col_name, col_def in new_columns:
                        try:
                            cursor.execute(f"""
                                SELECT COUNT(*) as count
                                FROM information_schema.columns
                                WHERE table_schema = %s AND table_name = 'company_info' AND column_name = %s
                            """, (self.db_config['database'], col_name))
                            col_result = cursor.fetchone()
                            if col_result['count'] == 0:
                                cursor.execute(f"ALTER TABLE company_info ADD COLUMN {col_name} {col_def}")
                                print(f"✓ 컬럼 추가: {col_name}")
                        except Exception as alter_error:
                            print(f"컬럼 {col_name} 추가 중 오류 (무시 가능): {str(alter_error)}")
                    conn.commit()
            cursor.close()
        except Exception as e:
            print(f"company_info 테이블 생성 중 오류: {str(e)}")

    def _ensure_job_details_table(self, conn):
        """job_details 테이블 생성"""
        try:
            cursor = conn.cursor()
            
            # 테이블 존재 여부 확인
            if USE_POSTGRES:
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'job_details'
                """)
            else:
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM information_schema.tables
                    WHERE table_schema = %s AND table_name = 'job_details'
                """, (self.db_config['database'],))
            
            result = cursor.fetchone()
            if result['count'] == 0:
                if USE_POSTGRES:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS job_details (
                            job_id BIGINT PRIMARY KEY,
                            summary TEXT,
                            wage_text TEXT,
                            wage_source TEXT,
                            aptitude_text TEXT,
                            abilities TEXT,
                            majors TEXT,
                            certifications TEXT,
                            raw_data TEXT,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                else:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS job_details (
                            job_id BIGINT PRIMARY KEY COMMENT 'CareerNet 직업 코드',
                            summary TEXT COMMENT '상세 직업 개요',
                            wage_text TEXT COMMENT '연봉 텍스트',
                            wage_source TEXT COMMENT '연봉 출처 및 상세',
                            aptitude_text TEXT COMMENT '적성 상세',
                            abilities JSON COMMENT '능력/지식/환경 (JSON)',
                            majors JSON COMMENT '관련 학과 및 통계 (JSON)',
                            certifications JSON COMMENT '자격증 목록 (JSON)',
                            raw_data JSON COMMENT '원본 데이터 (JSON)',
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='직업 상세 정보'
                    """)
                conn.commit()
                print("job_details 테이블이 생성되었습니다.")
        except Exception as e:
            print(f"job_details 테이블 생성 중 오류: {str(e)}")
    def _ensure_major_details_table(self, conn):
        """major_details 테이블 생성"""
        try:
            cursor = conn.cursor()
            
            # 테이블 존재 여부 확인
            if USE_POSTGRES:
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'major_details'
                """)
            else:
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM information_schema.tables
                    WHERE table_schema = %s AND table_name = 'major_details'
                """, (self.db_config['database'],))
            
            result = cursor.fetchone()
            if result['count'] == 0:
                if USE_POSTGRES:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS major_details (
                            major_id BIGINT PRIMARY KEY,
                            major_name VARCHAR(255) NOT NULL,
                            summary TEXT,
                            interest TEXT,
                            property TEXT,
                            job TEXT,
                            salary TEXT,
                            employment TEXT,
                            raw_data JSONB,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                else:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS major_details (
                            major_id BIGINT PRIMARY KEY COMMENT 'CareerNet 학과 코드',
                            major_name VARCHAR(255) NOT NULL COMMENT '학과명',
                            summary TEXT COMMENT '학과 개요',
                            interest TEXT COMMENT '적성 및 흥미',
                            property TEXT COMMENT '학과 특성',
                            job TEXT COMMENT '관련 직업',
                            salary TEXT COMMENT '임금 정보',
                            employment TEXT COMMENT '취업률 정보',
                            raw_data JSON COMMENT '원본 데이터 (JSON)',
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학과 상세 정보'
                    """)
                conn.commit()
                print("major_details 테이블이 생성되었습니다.")
        except Exception as e:
            print(f"major_details 테이블 생성 중 오류: {str(e)}")


    def save_job_details(self, details: Dict) -> bool:
        """
        직업 상세 정보를 저장합니다.
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # JSON 필드 직렬화
                import json
                abilities_json = json.dumps(details.get('abilities', {}), ensure_ascii=False)
                majors_json = json.dumps(details.get('majors', {}), ensure_ascii=False)
                certifications_json = json.dumps(details.get('certifications', []), ensure_ascii=False)
                raw_data_json = json.dumps(details.get('raw_data', {}), ensure_ascii=False)
                
                if USE_POSTGRES:
                    cursor.execute("""
                        INSERT INTO job_details (
                            job_id, summary, wage_text, wage_source, aptitude_text,
                            abilities, majors, certifications, raw_data, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, CURRENT_TIMESTAMP
                        )
                        ON CONFLICT (job_id)
                        DO UPDATE SET
                            summary = EXCLUDED.summary,
                            wage_text = EXCLUDED.wage_text,
                            wage_source = EXCLUDED.wage_source,
                            aptitude_text = EXCLUDED.aptitude_text,
                            abilities = EXCLUDED.abilities,
                            majors = EXCLUDED.majors,
                            certifications = EXCLUDED.certifications,
                            raw_data = EXCLUDED.raw_data,
                            updated_at = CURRENT_TIMESTAMP
                    """, (
                        details.get('job_id'),
                        details.get('summary'),
                        details.get('wage_text'),
                        details.get('wage_source'),
                        details.get('aptitude_text'),
                        abilities_json,
                        majors_json,
                        certifications_json,
                        raw_data_json
                    ))
                else:
                    cursor.execute("""
                        INSERT INTO job_details (
                            job_id, summary, wage_text, wage_source, aptitude_text,
                            abilities, majors, certifications, raw_data, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, CURRENT_TIMESTAMP
                        )
                        ON DUPLICATE KEY UPDATE
                            summary = VALUES(summary),
                            wage_text = VALUES(wage_text),
                            wage_source = VALUES(wage_source),
                            aptitude_text = VALUES(aptitude_text),
                            abilities = VALUES(abilities),
                            majors = VALUES(majors),
                            certifications = VALUES(certifications),
                            raw_data = VALUES(raw_data),
                            updated_at = CURRENT_TIMESTAMP
                    """, (
                        details.get('job_id'),
                        details.get('summary'),
                        details.get('wage_text'),
                        details.get('wage_source'),
                        details.get('aptitude_text'),
                        abilities_json,
                        majors_json,
                        certifications_json,
                        raw_data_json
                    ))
                
                conn.commit()
                return True
                
        except Exception as e:
            print(f"직업 상세 정보 저장 실패 (ID: {details.get('job_id')}): {str(e)}")
            return False
    def save_major_details(self, details: Dict) -> bool:
        """
        학과 상세 정보를 저장합니다.
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # JSON 필드 직렬화
                import json
                raw_data_json = json.dumps(details.get('raw_data', {}), ensure_ascii=False)
                
                if USE_POSTGRES:
                    cursor.execute("""
                        INSERT INTO major_details (
                            major_id, major_name, summary, interest, property,
                            job, salary, employment, raw_data, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, CURRENT_TIMESTAMP
                        )
                        ON CONFLICT (major_id)
                        DO UPDATE SET
                            major_name = EXCLUDED.major_name,
                            summary = EXCLUDED.summary,
                            interest = EXCLUDED.interest,
                            property = EXCLUDED.property,
                            job = EXCLUDED.job,
                            salary = EXCLUDED.salary,
                            employment = EXCLUDED.employment,
                            raw_data = EXCLUDED.raw_data,
                            updated_at = CURRENT_TIMESTAMP
                    """, (
                        details.get('major_id'),
                        details.get('major_name'),
                        details.get('summary'),
                        details.get('interest'),
                        details.get('property'),
                        details.get('job'),
                        details.get('salary'),
                        details.get('employment'),
                        raw_data_json
                    ))
                else:
                    cursor.execute("""
                        INSERT INTO major_details (
                            major_id, major_name, summary, interest, property,
                            job, salary, employment, raw_data, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, CURRENT_TIMESTAMP
                        )
                        ON DUPLICATE KEY UPDATE
                            major_name = VALUES(major_name),
                            summary = VALUES(summary),
                            interest = VALUES(interest),
                            property = VALUES(property),
                            job = VALUES(job),
                            salary = VALUES(salary),
                            employment = VALUES(employment),
                            raw_data = VALUES(raw_data),
                            updated_at = CURRENT_TIMESTAMP
                    """, (
                        details.get('major_id'),
                        details.get('major_name'),
                        details.get('summary'),
                        details.get('interest'),
                        details.get('property'),
                        details.get('job'),
                        details.get('salary'),
                        details.get('employment'),
                        raw_data_json
                    ))
                
                conn.commit()
                return True
                
        except Exception as e:
            print(f"학과 상세 정보 저장 실패 (ID: {details.get('major_id')}): {str(e)}")
            return False


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
                
                # 2.5단계: tech_stack, required_skills, applicant_count 컬럼이 없으면 추가
                try:
                    cursor.execute("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_name = 'job_listings' AND column_name = 'tech_stack'
                    """)
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE job_listings ADD COLUMN tech_stack TEXT")
                        print("✓ tech_stack 컬럼 추가됨")

                    cursor.execute("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_name = 'job_listings' AND column_name = 'required_skills'
                    """)
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE job_listings ADD COLUMN required_skills TEXT")
                        print("✓ required_skills 컬럼 추가됨")

                    cursor.execute("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_name = 'job_listings' AND column_name = 'applicant_count'
                    """)
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE job_listings ADD COLUMN applicant_count INTEGER DEFAULT 0")
                        print("✓ applicant_count 컬럼 추가됨")

                    cursor.execute("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_name = 'job_listings' AND column_name = 'preferred_majors'
                    """)
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE job_listings ADD COLUMN preferred_majors TEXT")
                        print("✓ preferred_majors 컬럼 추가됨")

                    cursor.execute("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_name = 'job_listings' AND column_name = 'deadline'
                    """)
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE job_listings ADD COLUMN deadline TEXT")
                        print("✓ deadline 컬럼 추가됨")

                    cursor.execute("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_name = 'job_listings' AND column_name = 'work_location'
                    """)
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE job_listings ADD COLUMN work_location TEXT")
                        print("✓ work_location 컬럼 추가됨")

                    cursor.execute("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_name = 'job_listings' AND column_name = 'salary'
                    """)
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE job_listings ADD COLUMN salary TEXT")
                        print("✓ salary 컬럼 추가됨")

                    cursor.execute("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_name = 'job_listings' AND column_name = 'core_competencies'
                    """)
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE job_listings ADD COLUMN core_competencies TEXT")
                        print("✓ core_competencies 컬럼 추가됨")
                    conn.commit()
                except Exception as col_error:
                    print(f"컬럼 추가 중 오류 (무시 가능): {col_error}")

                # 3단계: 새 공고만 INSERT
                insert_sql = """
                    INSERT INTO job_listings (
                        site_name, site_url, job_id, title, company,
                        location, description, url, reward, experience,
                        search_keyword, crawled_at, tech_stack, required_skills, applicant_count,
                        preferred_majors, deadline, work_location, salary, core_competencies
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s
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
                        
                        # tech_stack 처리 (리스트 또는 문자열)
                        tech_stack = job.get("tech_stack")
                        if isinstance(tech_stack, list):
                            tech_stack = ",".join(tech_stack)
                        elif tech_stack is not None:
                            tech_stack = str(tech_stack)

                        # required_skills 처리
                        required_skills = job.get("required_skills")
                        if required_skills is not None:
                            required_skills = str(required_skills)[:2000]  # 최대 2000자

                        # applicant_count 처리
                        applicant_count = job.get("applicant_count") or 0

                        # preferred_majors 처리 (리스트 또는 문자열)
                        preferred_majors = job.get("preferred_majors")
                        if isinstance(preferred_majors, list):
                            preferred_majors = ",".join(preferred_majors)
                        elif preferred_majors is not None:
                            preferred_majors = str(preferred_majors)

                        # deadline 처리
                        deadline = job.get("deadline") or ""

                        # work_location 처리
                        work_location = job.get("work_location") or ""

                        # salary 처리
                        salary = job.get("salary") or ""

                        # core_competencies 처리 (리스트 또는 문자열)
                        core_competencies = job.get("core_competencies")
                        if isinstance(core_competencies, list):
                            core_competencies = ",".join(core_competencies)
                        elif core_competencies is not None:
                            core_competencies = str(core_competencies)
                        else:
                            core_competencies = ""

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
                            datetime.now(),
                            tech_stack,
                            required_skills,
                            applicant_count,
                            preferred_majors,
                            deadline,
                            work_location,
                            salary,
                            core_competencies
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

    def save_company_info(
        self,
        site_name: str,
        companies: List[Dict]
    ) -> int:
        """
        기업 정보를 데이터베이스에 저장합니다.
        중복된 기업은 업데이트됩니다.

        Args:
            site_name: 사이트 이름
            companies: 기업 정보 리스트

        Returns:
            저장된 기업 수
        """
        if not companies:
            return 0

        saved_count = 0
        skipped_count = 0

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                for company in companies:
                    try:
                        if USE_POSTGRES:
                            # PostgreSQL UPSERT (ON CONFLICT UPDATE)
                            cursor.execute("""
                                INSERT INTO company_info (
                                    site_name, company_id, company_name, industry,
                                    established_year, employee_count, location, address,
                                    description, vision, benefits, culture, average_salary,
                                    company_type, revenue, ceo_name, capital,
                                    homepage_url, recruitment_url, logo_url, crawled_at
                                ) VALUES (
                                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
                                )
                                ON CONFLICT (site_name, company_id)
                                DO UPDATE SET
                                    company_name = EXCLUDED.company_name,
                                    industry = EXCLUDED.industry,
                                    established_year = EXCLUDED.established_year,
                                    employee_count = EXCLUDED.employee_count,
                                    location = EXCLUDED.location,
                                    address = EXCLUDED.address,
                                    description = EXCLUDED.description,
                                    vision = EXCLUDED.vision,
                                    benefits = EXCLUDED.benefits,
                                    culture = EXCLUDED.culture,
                                    average_salary = EXCLUDED.average_salary,
                                    company_type = EXCLUDED.company_type,
                                    revenue = EXCLUDED.revenue,
                                    ceo_name = EXCLUDED.ceo_name,
                                    capital = EXCLUDED.capital,
                                    homepage_url = EXCLUDED.homepage_url,
                                    recruitment_url = EXCLUDED.recruitment_url,
                                    logo_url = EXCLUDED.logo_url,
                                    crawled_at = CURRENT_TIMESTAMP,
                                    updated_at = CURRENT_TIMESTAMP
                            """, (
                                site_name,
                                company.get('company_id'),
                                company.get('company_name'),
                                company.get('industry'),
                                company.get('established_year'),
                                company.get('employee_count'),
                                company.get('location'),
                                company.get('address'),
                                company.get('description'),
                                company.get('vision'),
                                company.get('benefits'),
                                company.get('culture'),
                                company.get('average_salary'),
                                company.get('company_type'),
                                company.get('revenue'),
                                company.get('ceo_name'),
                                company.get('capital'),
                                company.get('homepage_url'),
                                company.get('recruitment_url'),
                                company.get('logo_url')
                            ))
                        else:
                            # MySQL UPSERT (ON DUPLICATE KEY UPDATE)
                            cursor.execute("""
                                INSERT INTO company_info (
                                    site_name, company_id, company_name, industry,
                                    established_year, employee_count, location, address,
                                    description, vision, benefits, culture, average_salary,
                                    company_type, revenue, ceo_name, capital,
                                    homepage_url, recruitment_url, logo_url
                                ) VALUES (
                                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                                )
                                ON DUPLICATE KEY UPDATE
                                    company_name = VALUES(company_name),
                                    industry = VALUES(industry),
                                    established_year = VALUES(established_year),
                                    employee_count = VALUES(employee_count),
                                    location = VALUES(location),
                                    address = VALUES(address),
                                    description = VALUES(description),
                                    vision = VALUES(vision),
                                    benefits = VALUES(benefits),
                                    culture = VALUES(culture),
                                    average_salary = VALUES(average_salary),
                                    company_type = VALUES(company_type),
                                    revenue = VALUES(revenue),
                                    ceo_name = VALUES(ceo_name),
                                    capital = VALUES(capital),
                                    homepage_url = VALUES(homepage_url),
                                    recruitment_url = VALUES(recruitment_url),
                                    logo_url = VALUES(logo_url),
                                    crawled_at = CURRENT_TIMESTAMP,
                                    updated_at = CURRENT_TIMESTAMP
                            """, (
                                site_name,
                                company.get('company_id'),
                                company.get('company_name'),
                                company.get('industry'),
                                company.get('established_year'),
                                company.get('employee_count'),
                                company.get('location'),
                                company.get('address'),
                                company.get('description'),
                                company.get('vision'),
                                company.get('benefits'),
                                company.get('culture'),
                                company.get('average_salary'),
                                company.get('company_type'),
                                company.get('revenue'),
                                company.get('ceo_name'),
                                company.get('capital'),
                                company.get('homepage_url'),
                                company.get('recruitment_url'),
                                company.get('logo_url')
                            ))

                        saved_count += 1
                    except Exception as e:
                        print(f"기업 정보 저장 실패 ({company.get('company_name')}): {str(e)}")
                        skipped_count += 1
                        continue

                conn.commit()
                cursor.close()

                print(f"[DEBUG] Commit completed. Saved={saved_count}, Skipped={skipped_count}")

                if saved_count > 0:
                    print(f"{saved_count}개의 기업 정보가 데이터베이스에 저장되었습니다.")
                if skipped_count > 0:
                    print(f"{skipped_count}개의 기업 정보 저장 중 오류가 발생했습니다.")

                return saved_count

        except Exception as e:
            print(f"기업 정보 저장 중 오류 발생: {str(e)}")
            import traceback
            traceback.print_exc()
            return 0

    def execute_query(self, query: str, params: tuple = None):
        """
        SQL 쿼리 실행 (SELECT 전용)

        Args:
            query: SQL 쿼리
            params: 쿼리 파라미터

        Returns:
            쿼리 결과 (딕셔너리 리스트)
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)

                results = cursor.fetchall()

                # DictCursor/RealDictCursor 결과를 딕셔너리로 반환
                if results and isinstance(results[0], dict):
                    # 딕셔너리 그대로 반환
                    return [dict(row) for row in results]

                return results

        except Exception as e:
            print(f"쿼리 실행 실패: {str(e)}")
            raise e

    def execute_update(self, query: str, params: tuple = None):
        """
        SQL 쿼리 실행 (INSERT, UPDATE, DELETE 전용)

        Args:
            query: SQL 쿼리
            params: 쿼리 파라미터

        Returns:
            영향받은 행 수
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)

                conn.commit()
                return cursor.rowcount

        except Exception as e:
            print(f"쿼리 실행 실패: {str(e)}")
            raise e

    def get_conversation_history_by_user_id(self, user_id: str, limit: int = 100) -> str:
        """
        userId로 사용자의 모든 대화 기록을 조회합니다.

        Args:
            user_id: 사용자 ID
            limit: 최대 메시지 수

        Returns:
            대화 기록 문자열 (role: content 형식)
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                # career_sessions와 chat_messages 조인하여 조회
                query = """
                    SELECT cm.role, cm.content, cm.timestamp
                    FROM chat_messages cm
                    INNER JOIN career_sessions cs ON cm.session_id = cs.id
                    WHERE cs.user_id = %s
                    ORDER BY cm.timestamp ASC
                    LIMIT %s
                """
                cursor.execute(query, (user_id, limit))
                results = cursor.fetchall()

                if not results:
                    return ""

                # 대화 형식으로 변환
                conversation_lines = []
                for row in results:
                    # psycopg2는 튜플 반환, pymysql은 딕셔너리 반환
                    if isinstance(row, dict):
                        role = row.get('role')
                        content = row.get('content')
                    else:
                        role = row[0]
                        content = row[1]
                    conversation_lines.append(f"{role}: {content}")

                return "\n".join(conversation_lines)

        except Exception as e:
            print(f"대화 기록 조회 실패: {str(e)}")
            return ""

    def get_conversation_history_by_session_id(self, session_id: str, limit: int = 100) -> str:
        """
        sessionId(UUID)로 특정 세션의 대화 기록을 조회합니다.
        
        Args:
            session_id: 세션 UUID (예: "3adaf543-e2ce-4dd2-8254-6be2f0f56a3c")
            limit: 최대 메시지 수
        
        Returns:
            대화 기록 문자열 (role: content 형식)
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                # career_sessions와 chat_messages 조인하여 조회
                query = """
                    SELECT cm.role, cm.content, cm.timestamp
                    FROM chat_messages cm
                    INNER JOIN career_sessions cs ON cm.session_id = cs.id
                    WHERE cs.session_id = %s
                    ORDER BY cm.timestamp ASC
                    LIMIT %s
                """
                cursor.execute(query, (session_id, limit))
                results = cursor.fetchall()

                if not results:
                    return ""

                # 대화 형식으로 변환
                conversation_lines = []
                for row in results:
                    role = row.get('role', row[0]) if isinstance(row, dict) else row[0]
                    content = row.get('content', row[1]) if isinstance(row, dict) else row[1]
                    conversation_lines.append(f"{role}: {content}")

                return "\n".join(conversation_lines)

        except Exception as e:
            print(f"대화 기록 조회 실패 (sessionId: {session_id}): {str(e)}")
            return ""

    def _ensure_career_analysis_tables(self, conn):
        """career_analyses 및 job_recommendations 테이블을 생성/보정합니다."""
        try:
            cursor = conn.cursor()

            if USE_POSTGRES:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS career_analyses (
                        id BIGSERIAL PRIMARY KEY,
                        session_id BIGINT NOT NULL,
                        emotion_analysis TEXT,
                        emotion_score INT,
                        personality_analysis TEXT,
                        personality_type VARCHAR(50),
                        interest_analysis TEXT,
                        interest_areas JSONB,
                        comprehensive_analysis TEXT,
                        recommended_careers JSONB,
                        analyzed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (session_id) REFERENCES career_sessions(id) ON DELETE CASCADE
                    )
                """)
            else:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS career_analyses (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        session_id BIGINT NOT NULL,
                        emotion_analysis TEXT,
                        emotion_score INT,
                        personality_analysis TEXT,
                        personality_type VARCHAR(50),
                        interest_analysis TEXT,
                        interest_areas JSON,
                        comprehensive_analysis TEXT,
                        recommended_careers JSON,
                        analyzed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (session_id) REFERENCES career_sessions(id) ON DELETE CASCADE,
                        INDEX idx_session (session_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """)

            if USE_POSTGRES:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS job_recommendations (
                        id BIGSERIAL PRIMARY KEY,
                        user_id BIGINT NOT NULL,
                        job_name VARCHAR(255) NOT NULL,
                        job_code VARCHAR(100),
                        match_score INT DEFAULT 0,
                        category VARCHAR(100),
                        description TEXT,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE (user_id, job_name)
                    )
                """)
            else:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS job_recommendations (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        user_id BIGINT NOT NULL,
                        job_name VARCHAR(255) NOT NULL,
                        job_code VARCHAR(100),
                        match_score INT DEFAULT 0,
                        category VARCHAR(100),
                        description TEXT,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY uk_user_job (user_id, job_name),
                        INDEX idx_user (user_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """)

            conn.commit()

        except Exception as e:
            print(f"커리어 분석 테이블 생성 중 오류 (무시 가능): {str(e)}")
    
    def save_career_analysis(self, session_identifier: str, user_id: Optional[str], analysis_data: Dict) -> bool:
        """career_analyses 테이블에 분석 결과를 저장하거나 갱신합니다."""
        if not session_identifier:
            raise ValueError("session_identifier가 필요합니다.")
        if not analysis_data:
            raise ValueError("analysis_data가 비어 있습니다.")

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                session_pk = None
                session_user_id = None

                cursor.execute(
                    """
                    SELECT id, user_id
                    FROM career_sessions
                    WHERE session_id = %s
                    LIMIT 1
                    """,
                    (session_identifier,),
                )
                row = cursor.fetchone()

                if row:
                    if isinstance(row, dict):
                        session_pk = row.get("id")
                        session_user_id = row.get("user_id")
                    else:
                        session_pk = row[0]
                        session_user_id = row[1] if len(row) > 1 else None

                if session_pk is None:
                    try:
                        numeric_id = int(session_identifier)
                        cursor.execute(
                            """
                            SELECT id, user_id
                            FROM career_sessions
                            WHERE id = %s
                            LIMIT 1
                            """,
                            (numeric_id,),
                        )
                        row = cursor.fetchone()
                        if row:
                            if isinstance(row, dict):
                                session_pk = row.get("id")
                                session_user_id = row.get("user_id")
                            else:
                                session_pk = row[0]
                                session_user_id = row[1] if len(row) > 1 else None
                    except (ValueError, TypeError):
                        pass

                if session_pk is None:
                    raise ValueError(f"session_id '{session_identifier}'에 해당하는 세션을 찾을 수 없습니다.")

                resolved_user_id = user_id or session_user_id

                emotion = analysis_data.get("emotion") or {}
                personality = analysis_data.get("personality") or {}
                interest = analysis_data.get("interest") or {}

                emotion_analysis = emotion.get("description")
                emotion_score = emotion.get("score")

                personality_analysis = personality.get("description")
                personality_type = personality.get("type")

                interest_analysis = interest.get("description")
                interest_areas = interest.get("areas") or []

                comprehensive_analysis = analysis_data.get("comprehensiveAnalysis")
                recommended_careers = analysis_data.get("recommendedCareers") or []

                interest_areas_json = (
                    json.dumps(interest_areas, ensure_ascii=False) if interest_areas else None
                )
                recommended_careers_json = json.dumps(
                    recommended_careers, ensure_ascii=False
                )

                now = datetime.utcnow()

                if USE_POSTGRES:
                    query = """
                        INSERT INTO career_analyses (
                            session_id,
                            emotion_analysis, emotion_score,
                            personality_analysis, personality_type,
                            interest_analysis, interest_areas,
                            comprehensive_analysis, recommended_careers,
                            analyzed_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                        ON CONFLICT (session_id) DO UPDATE SET
                            emotion_analysis = EXCLUDED.emotion_analysis,
                            emotion_score = EXCLUDED.emotion_score,
                            personality_analysis = EXCLUDED.personality_analysis,
                            personality_type = EXCLUDED.personality_type,
                            interest_analysis = EXCLUDED.interest_analysis,
                            interest_areas = EXCLUDED.interest_areas,
                            comprehensive_analysis = EXCLUDED.comprehensive_analysis,
                            recommended_careers = EXCLUDED.recommended_careers,
                            updated_at = EXCLUDED.updated_at
                    """
                else:
                    query = """
                        INSERT INTO career_analyses (
                            session_id,
                            emotion_analysis, emotion_score,
                            personality_analysis, personality_type,
                            interest_analysis, interest_areas,
                            comprehensive_analysis, recommended_careers,
                            analyzed_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                        ON DUPLICATE KEY UPDATE
                            emotion_analysis = VALUES(emotion_analysis),
                            emotion_score = VALUES(emotion_score),
                            personality_analysis = VALUES(personality_analysis),
                            personality_type = VALUES(personality_type),
                            interest_analysis = VALUES(interest_analysis),
                            interest_areas = VALUES(interest_areas),
                            comprehensive_analysis = VALUES(comprehensive_analysis),
                            recommended_careers = VALUES(recommended_careers),
                            updated_at = VALUES(updated_at)
                    """

                cursor.execute(
                    query,
                    (
                        session_pk,
                        emotion_analysis,
                        emotion_score,
                        personality_analysis,
                        personality_type,
                        interest_analysis,
                        interest_areas_json,
                        comprehensive_analysis,
                        recommended_careers_json,
                        now,
                        now,
                    ),
                )

                if resolved_user_id:
                    print(
                        f"[DB] career_analyses 저장 완료 (session_id={session_identifier}, user_id={resolved_user_id})"
                    )
                else:
                    print(f"[DB] career_analyses 저장 완료 (session_id={session_identifier})")

                return True

        except Exception as e:
            print(f"[DB] career_analyses 저장 실패: {e}")
            raise e
