import os
from supabase import create_client, Client

class SupabaseClient:
    def __init__(self):
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not url or not key:
            print("Warning: SUPABASE_URL or SUPABASE_SERVICE_KEY not found in environment variables.")
        
        self.client: Client = create_client(url, key)
