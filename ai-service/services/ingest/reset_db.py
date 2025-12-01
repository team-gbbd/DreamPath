import os
import sys
from dotenv import load_dotenv

# Add project root to path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir, os.pardir))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from services.database_service import DatabaseService

def reset_database():
    print("Starting Database Reset...")
    db = DatabaseService()
    
    # 1. Drop unused tables
    tables_to_drop = ['school_vector', 'ncs_duty', 'worknet_vector']
    
    with db.get_connection() as conn:
        cursor = conn.cursor()
        for table in tables_to_drop:
            try:
                print(f"Dropping table: {table}...")
                cursor.execute(f"DROP TABLE IF EXISTS {table}")
                print(f"✓ Dropped {table}")
            except Exception as e:
                print(f"Error dropping {table}: {e}")
        
        # 2. Truncate vector tables (keep structure, delete data)
        tables_to_truncate = ['job_vector', 'department_vector', 'case_vector', 'profile_vector', 'ncs_vector']
        
        for table in tables_to_truncate:
            try:
                print(f"Truncating table: {table}...")
                cursor.execute(f"TRUNCATE TABLE {table}")
                print(f"✓ Truncated {table}")
            except Exception as e:
                print(f"Error truncating {table}: {e}")
                
    print("Database Reset Completed.")

if __name__ == "__main__":
    reset_database()
