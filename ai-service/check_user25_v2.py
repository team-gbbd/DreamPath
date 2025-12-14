# -*- coding: utf-8 -*-
from supabase import create_client
import os
import json
from dotenv import load_dotenv
load_dotenv()

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

# 최신 career_analyses 직접 조회
print("=== Recent career_analyses (any user) ===")
recent = supabase.table('career_analyses').select('*').order('analyzed_at', desc=True).limit(3).execute()
if recent.data:
    for r in recent.data:
        print(f"  session_id: {r.get('session_id')}, analyzed_at: {r.get('analyzed_at')}")
        rec = r.get('recommended_careers')
        if rec:
            print(f"    recommended_careers: {json.dumps(rec, ensure_ascii=False)[:200]}...")
else:
    print("No career_analyses found at all!")

# career_sessions에서 유저 25의 세션 ID 찾기
print("\n=== career_sessions for user 25 (latest 5) ===")
sessions = supabase.table('career_sessions').select('id, user_id, created_at').eq('user_id', '25').order('created_at', desc=True).limit(5).execute()
if sessions.data:
    for s in sessions.data:
        print(f"  session_id: {s.get('id')}, created: {s.get('created_at')}")

    # 모든 세션에서 career_analyses 찾기
    print(f"\n=== checking career_analyses for user 25 sessions ===")
    for s in sessions.data:
        session_id = s.get('id')
        analyses = supabase.table('career_analyses').select('*').eq('session_id', session_id).limit(1).execute()
        if analyses.data:
            print(f"\n  FOUND! session {session_id}")
            rec_careers = analyses.data[0].get('recommended_careers')
            if rec_careers:
                print(f"    recommended_careers: {json.dumps(rec_careers, ensure_ascii=False, indent=2)}")
            else:
                print(f"    recommended_careers is None!")
        else:
            print(f"  session {session_id}: No analysis")
else:
    print("No career_sessions for user 25")

# job_listings 샘플 확인
print("\n=== job_listings sample (5 recent) ===")
jobs = supabase.table('job_listings').select('id, title, company, site_name').order('crawled_at', desc=True).limit(5).execute()
if jobs.data:
    for j in jobs.data:
        print(f"  {j.get('id')}: {j.get('title')} ({j.get('company')}) - {j.get('site_name')}")
else:
    print("No job_listings data")
