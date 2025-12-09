import uuid
import requests
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository

API_URL = 'https://apis.data.go.kr/B490007/ncsSqfDuty'
API_KEY = '12fe084e6eb3bce105546b0e6d1622b0227b900d7d466bf4dd35a4575c5a4b25'


class NCS_SQF_Ingest:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    def fetch_page(self, page=1):
        params = {
            'serviceKey': API_KEY,
            'pageNo': page,
            'numOfRows': 100,
            '_type': 'json'
        }
        response = requests.get(API_URL, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get('data', {}).get('row', [])

    def ingest_one(self, item):
        dto = {
            'ncsCd': item.get('ncsLclasCd', ''),
            'dutyName': item.get('dutyNm', ''),
            'dutyDesc': item.get('dutyDef', ''),
            'jobTask': item.get('dutyAcarr', ''),
            'autonomy': item.get('autoResp', ''),
            'responsibility': item.get('dutyResp', ''),
            'requiredMajor': item.get('dutyEduTrain', ''),
            'requiredCert': item.get('dutyQualf', ''),
            'requiredEdu': item.get('dutyEduTrain', ''),
            'requiredCareer': item.get('dutyCarr', '')
        }

        doc = DocumentBuilder.build_ncs_document(dto)
        vector_id = f"ncs_{dto['ncsCd']}_{uuid.uuid4()}"

        self.vector.process(vector_id, doc, metadata={'type': 'ncs'})
        self.repo.save_vector(
            'ncs_vector',
            {
                'original_id': dto['ncsCd'],
                'document_text': doc,
                'vector_id': vector_id
            }
        )

    def ingest_all(self):
        page = 1
        while True:
            rows = self.fetch_page(page)
            if not rows:
                break
            for row in rows:
                self.ingest_one(row)
            page += 1
