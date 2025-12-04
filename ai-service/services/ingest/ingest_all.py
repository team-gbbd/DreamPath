import os
import sys
import concurrent.futures
from dotenv import load_dotenv

load_dotenv()

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir, os.pardir))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from services.ingest.ingest_career_job import CareerJobIngest
from services.ingest.ingest_career_department import CareerDepartmentIngest
from services.ingest.ingest_career_case import CareerCaseIngest


class IngestAll:

    @staticmethod
    def run_job_ingest():
        print('\n===== [1] CareerNet 직업백과 (Job Encyclopedia) ingest 시작 =====')
        try:
            CareerJobIngest().ingest_all()
            print('✅ 직업 데이터 수집 완료')
        except Exception as e:
            print(f'❌ 직업 데이터 수집 실패: {e}')

    @staticmethod
    def run_dept_ingest():
        print('\n===== [2] CareerNet 학과정보 (Department) ingest 시작 =====')
        try:
            CareerDepartmentIngest().ingest_all()
            print('✅ 학과 데이터 수집 완료')
        except Exception as e:
            print(f'❌ 학과 데이터 수집 실패: {e}')

    @staticmethod
    def run_case_ingest():
        print('\n===== [3] CareerNet 상담사례 (Counsel Case) ingest 시작 =====')
        try:
            # 상담사례 수집 실행
            CareerCaseIngest().ingest_all()
            print('✅ 상담사례 수집 완료')
        except Exception as e:
            print(f'❌ 상담사례 수집 실패: {e}')

    @staticmethod
    def run_all():
        print('🚀 데이터 수집 시작 (병렬 실행)...')
        
        # 직업과 학과를 병렬로 실행
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future_job = executor.submit(IngestAll.run_job_ingest)
            future_dept = executor.submit(IngestAll.run_dept_ingest)
            
            # 완료 대기
            concurrent.futures.wait([future_job, future_dept])
            
        # 상담사례는 순차적으로 (또는 건너뜀)
        IngestAll.run_case_ingest()

        print('\n===== 🎉 모든 ingest 작업 완료! =====')


if __name__ == '__main__':
    IngestAll.run_all()
