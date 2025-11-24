import uuid
import requests
from bs4 import BeautifulSoup
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository

API_URL = 'https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do'
API_KEY = '4a6aceb3-03c4-426d-8c86-d82b727da2ed'


class WorkNetJobIngest:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    @staticmethod
    def _text(node, tag):
        t = node.find(tag)
        return t.text.strip() if t and t.text else ""

    def fetch(self, page=1):
        """WorkNet XML 구조 대응 + 오류 메시지 처리"""
        params = {
            'authKey': API_KEY,
            'callTp': 'L',
            'returnType': 'XML',
            'startPage': page,
            'display': 100
        }

        res = requests.get(API_URL, params=params)
        res.raise_for_status()

        soup = BeautifulSoup(res.text, 'xml')

        # 1) 오류 메시지 존재 체크
        err = soup.find('errorMsg')
        if err:
            raise Exception(f"WorkNet API Error: {err.text.strip()}")

        # 2) WorkNet XML 구조는 <wanted> 또는 <item>로 내려올 수 있음
        items = soup.select('wantedList > wanted')
        if not items:
            items = soup.find_all('wanted')
        if not items:
            items = soup.find_all('item')  # fallback

        rows = []
        for item in items:
            rows.append({
                'wantedAuthNo': self._text(item, 'wantedAuthNo'),
                'company': self._text(item, 'company'),
                'jobCont': self._text(item, 'jobCont'),
                'workRegion': self._text(item, 'workRegion'),
            })

        return rows

    def ingest_one(self, item):
        dto = {
            'jobCd': item.get('wantedAuthNo', ''),
            'jobName': item.get('company', ''),
            'jobDesc': item.get('jobCont', ''),
            'jobEnv': item.get('workRegion', ''),
            'jobValues': '',
            'jobAbilities': '',
            'majorRequired': '',
            'employmentPath': ''
        }

        doc = DocumentBuilder.build_job_document(dto)
        vector_id = f"worknet_{dto['jobCd']}_{uuid.uuid4()}"

        self.vector.process(vector_id, doc, metadata={'type': 'job'})
        self.repo.save_vector(
            'job_vector',
            {
                'original_id': dto['jobCd'],
                'document_text': doc,
                'vector_id': vector_id
            }
        )

    def ingest_all(self):
        page = 1
        while True:
            rows = self.fetch(page)
            if not rows:
                break
            for row in rows:
                self.ingest_one(row)
            page += 1

