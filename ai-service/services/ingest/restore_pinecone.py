import os
import time
import math
from dotenv import load_dotenv
from services.vector.supabase_vector_repository import SupabaseVectorRepository
from services.rag.pinecone_vector_service import PineconeVectorService

load_dotenv()

BATCH_SIZE = 50  # OpenAI embedding batch size (and Pinecone upsert)
TABLES = [
    {'name': 'case_vector', 'type': 'case'},
    {'name': 'job_vector', 'type': 'job'},
    {'name': 'department_vector', 'type': 'department'}
]

def restore_pinecone():
    print("Starting Pinecone restoration...")
    
    # Initialize services
    supabase_repo = SupabaseVectorRepository()
    supabase = supabase_repo.supabase
    
    pinecone_service = PineconeVectorService()
    index = pinecone_service.index
    
    total_restored = 0
    
    for table_info in TABLES:
        table_name = table_info['name']
        doc_type = table_info['type']
        
        print(f"\nProcessing table: {table_name}")
        
        # Get total count
        count_res = supabase.table(table_name).select('*', count='exact', head=True).execute()
        total_count = count_res.count
        print(f"Total records to process: {total_count}")
        
        processed = 0
        
        while processed < total_count:
            # Fetch batch from Supabase
            start = processed
            end = processed + BATCH_SIZE - 1
            
            try:
                # Fetch data
                response = supabase.table(table_name)\
                    .select('original_id, document_text, vector_id')\
                    .range(start, end)\
                    .execute()
                
                rows = response.data
                if not rows:
                    break
                
                vectors_to_upsert = []
                
                # Collect texts for batch embedding
                texts_to_embed = []
                valid_rows = []
                
                for row in rows:
                    text = row.get('document_text')
                    if text:
                        texts_to_embed.append(text)
                        valid_rows.append(row)
                
                if not texts_to_embed:
                    processed += len(rows)
                    continue
                
                try:
                    # Batch embedding generation
                    # Access OpenAI client directly from pinecone_service
                    openai_client = pinecone_service.client
                    
                    # OpenAI embedding model
                    MODEL = "text-embedding-3-large"
                    
                    response = openai_client.embeddings.create(
                        model=MODEL,
                        input=texts_to_embed
                    )
                    
                    embeddings = [data.embedding for data in response.data]
                    
                    vectors_to_upsert = []
                    for i, row in enumerate(valid_rows):
                        original_id = row.get('original_id')
                        vector_id = row.get('vector_id')
                        
                        if not vector_id:
                            vector_id = f"{doc_type}_{original_id}"
                            
                        vectors_to_upsert.append({
                            "id": vector_id,
                            "values": embeddings[i],
                            "metadata": {
                                "type": doc_type,
                                "original_id": str(original_id)
                            }
                        })
                    
                    # Upsert batch to Pinecone
                    if vectors_to_upsert:
                        index.upsert(vectors=vectors_to_upsert)
                        print(f"Upserted batch {start}-{end} ({len(vectors_to_upsert)} records)")
                    
                    processed += len(rows)
                    total_restored += len(vectors_to_upsert)
                    
                    # Rate limit safety
                    time.sleep(0.1)
                    
                except Exception as e:
                    print(f"Error processing batch {start}-{end}: {e}")
                    time.sleep(5) # Longer pause on batch error
                
            except Exception as e:
                print(f"Error processing batch {start}-{end}: {e}")
                time.sleep(5) # Longer pause on batch error
                
    print(f"\nRestoration complete! Total records restored: {total_restored}")

if __name__ == "__main__":
    restore_pinecone()
