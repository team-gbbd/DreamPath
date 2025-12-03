import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

try:
    response = supabase.table('job_vector').select('*').limit(1).execute()
    if response.data:
        print("Columns in job_vector:", response.data[0].keys())
    else:
        print("job_vector table is empty.")
except Exception as e:
    print(f"Error: {e}")
