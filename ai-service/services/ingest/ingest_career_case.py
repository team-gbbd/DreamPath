import uuid
from services.ingest.careernet_client import CareerNetClient
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository


class CareerCaseIngest:

    # 상담사례 분류 코드 매핑
    CATEGORY_MAP = {
        'A01': '진로탐색 - 적성/흥미',
        'A02': '진로탐색 - 적성/흥미',
        'A03': '진로탐색 - 진로목표',
        'A04': '진로탐색 - 진로목표',
        'B01': '진로결정 - 자신감',
        'B02': '진로결정 - 자신감',
        'B03': '진로결정 - 주변 반대',
        'B04': '진로결정 - 주변 반대',
        'C01': '학업 - 학습방법',
        'C02': '학업 - 학습방법',
        'C03': '학업 - 진학',
        'C04': '학업 - 진학',
        'D01': '대인관계 - 친구',
        'D02': '대인관계 - 가족',
        'E01': '학교생활 - 적응',
        'E02': '학교생활 - 전학',
        'E03': '학교생활 - 학교선택',
        'E04': '학교생활 - 기타',
        'F01': '기타 - 일반상담',
    }

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    def ingest_all(self):
        print("Fetching CareerNet Counsel Cases...")
        
        # 상담사례는 전체 데이터가 적으므로(약 188개) 한 번에 가져옵니다.
        display = 500 
        
        try:
            data = CareerNetClient.call('COUNSEL', start=1, display=display)
            rows = data.get('dataSearch', {}).get('content', [])
            
            print(f"Found {len(rows)} counsel cases.")
            
            for item in rows:
                gubun_code = item.get('gubun', '')
                category_name = self.CATEGORY_MAP.get(gubun_code, gubun_code)
                
                dto = {
                    'caseId': item.get('code', ''),
                    'caseName': item.get('memo', '').strip(),
                    'category': category_name,
                    'categoryCode': gubun_code
                }

                doc = DocumentBuilder.build_case_document(dto)
                vector_id = f"case_{dto['caseId']}"

                metadata = {
                    'type': 'counsel',
                    'original_id': dto['caseId'],
                    'caseName': dto['caseName'],
                    'title': dto['caseName'],  # 프론트엔드 호환성
                    'category': dto['category'],
                    'categoryCode': dto['categoryCode']
                }
                self.vector.process(vector_id, doc, metadata=metadata)
                self.repo.save_vector('case_vector', {
                    'original_id': dto['caseId'],
                    'document_text': doc,
                    'vector_id': vector_id
                })
                
            print(f"Successfully ingested {len(rows)} counsel cases.")
            
        except Exception as e:
            print(f"Error during counsel ingestion: {e}")

