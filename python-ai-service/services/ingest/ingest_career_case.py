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
        data = CareerNetClient.call('counseling')
        rows = data.get('dataSearch', {}).get('content', [])

        for item in rows:
            dto = {
                'caseId': item.get('cntst_seq', ''),
                'title': item.get('title', ''),
                'summary': item.get('summary', ''),
                'situation': item.get('situation', ''),
                'counsel': item.get('counsel', ''),
                'result': item.get('result', '')
            }

            doc = DocumentBuilder.build_case_document(dto)
            vector_id = f"case_{dto['caseId']}_{uuid.uuid4()}"

            self.vector.process(vector_id, doc, metadata={'type': 'case'})
            self.repo.save_vector('case_vector', {
                'original_id': dto['caseId'],
                'document_text': doc,
                'vector_id': vector_id
            })
