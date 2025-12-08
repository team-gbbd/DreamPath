"""
데이터베이스 마이그레이션 실행 스크립트
"""
import os
import sys
from pathlib import Path

# 프로젝트 루트를 PYTHONPATH에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from services.database_service import DatabaseService


def run_migrations():
    """마이그레이션 파일을 순서대로 실행"""
    migrations_dir = Path(__file__).parent / "migrations"

    if not migrations_dir.exists():
        print(f"마이그레이션 디렉토리가 없습니다: {migrations_dir}")
        return False

    # .sql 파일들을 이름순으로 정렬
    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        print("실행할 마이그레이션 파일이 없습니다.")
        return False

    print(f"총 {len(migration_files)}개의 마이그레이션 파일을 실행합니다.\n")

    db = DatabaseService()

    for migration_file in migration_files:
        print(f"실행 중: {migration_file.name}")

        try:
            # SQL 파일 읽기
            with open(migration_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()

            # SQL 파일 실행 (여러 문장이 있을 수 있으므로 분리)
            statements = [s.strip() for s in sql_content.split(';') if s.strip()]

            with db.get_connection() as conn:
                cursor = conn.cursor()

                for statement in statements:
                    if statement:
                        try:
                            cursor.execute(statement)
                        except Exception as e:
                            # 이미 존재하는 테이블 등의 경고는 무시
                            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                                print(f"  ⚠ 경고 (무시됨): {e}")
                            else:
                                raise e

                conn.commit()
                cursor.close()

            print(f"  ✓ {migration_file.name} 완료\n")

        except Exception as e:
            print(f"  ✗ {migration_file.name} 실패: {e}\n")
            return False

    print("모든 마이그레이션이 성공적으로 완료되었습니다!")
    return True


if __name__ == "__main__":
    success = run_migrations()
    sys.exit(0 if success else 1)
