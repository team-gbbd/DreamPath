import uuid
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository


class NCSIngestService:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    def ingest(self, ncs):
        '''
        ncs 예시:
        {
            'ncsCd': '',
            'dutyName': '',
            'dutyDesc': '',
            'jobTask': '',
            'autonomy': '',
            'responsibility': '',
            'requiredMajor': '',
            'requiredCert': '',
            'requiredEdu': '',
            'requiredCareer': ''
        }
        '''
        doc = DocumentBuilder.build_ncs_document(ncs)
        vector_id = f"ncs_{ncs['ncsCd']}_{uuid.uuid4()}"

        self.vector.process(vector_id, doc, metadata={'type': 'ncs', 'ncsCd': ncs['ncsCd']})

        self.repo.save_vector(
            'ncs_vector',
            {
                'original_id': ncs['ncsCd'],
                'document_text': doc,
                'vector_id': vector_id
            }
        )
        return vector_id
