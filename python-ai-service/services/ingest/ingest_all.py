import os
import sys


from dotenv import load_dotenv

load_dotenv()

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir, os.pardir))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from services.ingest.ingest_ncs_sqf import NCS_SQF_Ingest
from services.ingest.ingest_ncs_basic import NCS_Basic_Ingest
from services.ingest.ingest_ncs_jobcom import NCS_JobCom_Ingest
from services.ingest.ingest_ncs_jobbase import NCS_JobBase_Ingest

from services.ingest.ingest_career_job import CareerJobIngest
from services.ingest.ingest_career_department import CareerDepartmentIngest
from services.ingest.ingest_career_case import CareerCaseIngest

from services.ingest.ingest_worknet import WorkNetJobIngest


class IngestAll:

    @staticmethod
    def run_all():
        print('\n===== [1] NCS SQF ingest =====')
        try:
            NCS_SQF_Ingest().ingest_all()
        except Exception as e:
            print('NCS SQF Error:', e)

        print('\n===== [2] NCS Basic ingest =====')
        try:
            NCS_Basic_Ingest().ingest_all()
        except Exception as e:
            print('NCS Basic Error:', e)

        print('\n===== [3] NCS JobCom ingest =====')
        try:
            NCS_JobCom_Ingest().ingest_all()
        except Exception as e:
            print('NCS JobCom Error:', e)

        print('\n===== [4] NCS JobBase ingest =====')
        try:
            NCS_JobBase_Ingest().ingest_all()
        except Exception as e:
            print('NCS JobBase Error:', e)

        print('\n===== [5] CareerNet 직업백과 ingest =====')
        try:
            CareerJobIngest().ingest_all()
        except Exception as e:
            print('Career Job Error:', e)

        print('\n===== [6] CareerNet 학과정보 ingest =====')
        try:
            CareerDepartmentIngest().ingest_all()
        except Exception as e:
            print('Career Department Error:', e)

        print('\n===== [7] CareerNet 상담사례 ingest =====')
        try:
            CareerCaseIngest().ingest_all()
        except Exception as e:
            print('Career Case Error:', e)

        print('\n===== [8] WorkNet 채용공고 ingest =====')
        try:
            WorkNetJobIngest().ingest_all()
        except Exception as e:
            print('WorkNet Error:', e)

        print('\n===== 🎉 모든 ingest 완료! =====')


if __name__ == '__main__':
    IngestAll.run_all()
