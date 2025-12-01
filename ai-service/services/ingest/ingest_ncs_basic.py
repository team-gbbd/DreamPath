import uuid
import requests
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository

API_URL = 'https://apis.data.go.kr/B490007/hrdkapi'   # 실제 Basic API 확인 필요
API_KEY = '12fe084e6eb3bce105546b0e6d1622b0227b900d7d466bf4dd35a4575c5a4b25'


class NCS_Basic_Ingest:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    def fetch(self, page=1):
        params = {
            'serviceKey': API_KEY,
            'pageNo': page,
            'numOfRows': 100,
            '_type': 'json'
        }
        response = requests.get(API_URL, params=params)
        response.raise_for_status()
        return response.json().get('data', {}).get('row', [])

    def ingest_one(self, item):
        dto = {
            'ncsCd': item.get('ability_id', ''),
            'dutyName': item.get('ability_name', ''),
            'dutyDesc': item.get('ability_content', ''),
            'jobTask': '',
            'autonomy': '',
            'responsibility': '',
            'requiredMajor': '',
            'requiredCert': '',
            'requiredEdu': '',
            'requiredCareer': ''
        }

        doc = DocumentBuilder.build_ncs_document(dto)
        vector_id = f"ncs_basic_{dto['ncsCd']}_{uuid.uuid4()}"

        self.vector.process(vector_id, doc)
        self.repo.save_vector('ncs_vector', {
            'original_id': dto['ncsCd'],
            'document_text': doc,
            'vector_id': vector_id
        })

    def ingest_all(self):
        rows = self.fetch()
        for row in rows:
            self.ingest_one(row)
