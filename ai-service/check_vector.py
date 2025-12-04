import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Supabase connection string from environment or hardcoded if needed (but better to use env)
# Assuming DATABASE_URL is available or constructing it
db_url = os.getenv("DATABASE_URL")
if not db_url:
    # Fallback to the one seen in logs if env not set
    db_url = "postgresql://postgres.aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT original_text FROM profile_vector ORDER BY updated_at DESC LIMIT 1;")
    row = cur.fetchone()
    if row:
        print("Latest Profile Vector Text:")
        print("-" * 20)
        print(row[0])
        print("-" * 20)
    else:
        print("No profile vector found.")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
