import uuid
from services.ingest.careernet_client import CareerNetClient
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository


class CareerDepartmentIngest:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    def ingest_all(self):
        page = 1
        display = 100
        
        while True:
            print(f"Fetching MAJOR page {page}...")
            # MAJOR API는 gubun 파라미터가 필수
            data = CareerNetClient.call('MAJOR', start=page, display=display, gubun='univ_list')
            rows = data.get('dataSearch', {}).get('content', [])
            
            if not rows:
                break
                
            for item in rows:
                dto = {
                    'deptCd': item.get('majorSeq', ''),  # API 실제 필드명: majorSeq
                    'deptName': item.get('facilName', ''),  # API 실제 필드명: facilName (학과명)
                    'intro': item.get('lClass', ''),  # API 실제 필드명: lClass (대분류)
                    'curriculum': item.get('mClass', ''),  # API 실제 필드명: mClass (중분류)
                    'relatedJobs': ''  # MAJOR API에는 관련 직업 정보 없음
                }

                doc = DocumentBuilder.build_department_document(dto)
                vector_id = f"dept_{dto['deptCd']}_{uuid.uuid4()}"

                self.vector.process(vector_id, doc, metadata={'type': 'department'})
                self.repo.save_vector('department_vector', {
                    'original_id': dto['deptCd'],
                    'document_text': doc,
                    'vector_id': vector_id
                })
            
            page += 1
