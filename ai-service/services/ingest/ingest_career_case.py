import uuid
from services.ingest.careernet_client import CareerNetClient
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository


class CareerCaseIngest:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    def ingest_all(self):
        page = 1
        display = 100
        
        while True:
            print(f"Fetching COUNSEL page {page}...")
            data = CareerNetClient.call('COUNSEL', start=page, display=display)
            rows = data.get('dataSearch', {}).get('content', [])
            
            if not rows:
                break
                
            for item in rows:
                dto = {
                    'caseId': item.get('code', ''),  # API 실제 필드명: code
                    'title': item.get('memo', ''),  # API 실제 필드명: memo (상담 내용)
                    'summary': item.get('gubun', ''),  # API 실제 필드명: gubun (구분)
                    'situation': '',  # COUNSEL API에는 상황 정보 없음
                    'counsel': item.get('memo', ''),  # memo를 상담 내용으로 사용
                    'result': ''  # COUNSEL API에는 결과 정보 없음
                }

                doc = DocumentBuilder.build_case_document(dto)
                vector_id = f"case_{dto['caseId']}_{uuid.uuid4()}"

                self.vector.process(vector_id, doc, metadata={'type': 'case'})
                self.repo.save_vector('case_vector', {
                    'original_id': dto['caseId'],
                    'document_text': doc,
                    'vector_id': vector_id
                })
            
            page += 1
