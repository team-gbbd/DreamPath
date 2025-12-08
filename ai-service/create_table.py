"""user_job_recommendations table creation script"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from services.database_service import DatabaseService

def create_table():
    db = DatabaseService()

    sql = '''
    CREATE TABLE IF NOT EXISTS user_job_recommendations (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        job_listing_id BIGINT NOT NULL,
        match_score DECIMAL(5,2) DEFAULT 0,
        match_reason TEXT,
        recommendation_data JSONB,
        calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, job_listing_id)
    )
    '''

    try:
        db.execute_update(sql)
        print("[OK] user_job_recommendations table created!")

        # Create indexes
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_ujr_user_id ON user_job_recommendations (user_id)",
            "CREATE INDEX IF NOT EXISTS idx_ujr_job_listing_id ON user_job_recommendations (job_listing_id)",
            "CREATE INDEX IF NOT EXISTS idx_ujr_match_score ON user_job_recommendations (match_score DESC)",
            "CREATE INDEX IF NOT EXISTS idx_ujr_calculated_at ON user_job_recommendations (calculated_at DESC)"
        ]

        for idx_sql in indexes:
            try:
                db.execute_update(idx_sql)
            except Exception as e:
                print(f"Index creation (can ignore): {e}")

        print("[OK] Indexes created!")

        # Verify table
        result = db.execute_query("SELECT COUNT(*) as cnt FROM user_job_recommendations")
        print(f"[OK] Table verified: {result}")

    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_table()
