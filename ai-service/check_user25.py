# -*- coding: utf-8 -*-
from supabase import create_client
import os
import json
from dotenv import load_dotenv
load_dotenv()

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

# 유저 25의 profile_analysis 전체 컬럼 확인
profile = supabase.table('profile_analysis').select('*').eq('user_id', 25).order('created_at', desc=True).limit(1).execute()

print("=== User 25 profile_analysis columns ===")
if profile.data:
    for k in profile.data[0].keys():
        print(f"  - {k}")

    # comprehensive_analysis 확인
    comp = profile.data[0].get('comprehensive_analysis')
    if comp:
        print(f"\ncomprehensive_analysis: {comp[:500]}...")
else:
    print("No profile_analysis data for user 25")

# job_recommendations 테이블 구조 확인
print("\n=== job_recommendations table columns ===")
job_recs = supabase.table('job_recommendations').select('*').eq('user_id', 25).order('match_score', desc=True).limit(5).execute()
if job_recs.data:
    for k in job_recs.data[0].keys():
        print(f"  - {k}: {job_recs.data[0].get(k)}")
else:
    print("No job recommendations for user 25")

# job_listings 테이블 구조 확인
print("\n=== job_listings sample ===")
jobs = supabase.table('job_listings').select('*').limit(3).execute()
if jobs.data:
    for k in jobs.data[0].keys():
        print(f"  - {k}")
