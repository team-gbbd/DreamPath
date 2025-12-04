"""
DreamPath 종합 자동 점검 스크립트
- DB 전체 테이블 및 데이터 점검
- Pinecone 벡터 상태 점검
- 데이터 일관성 검증
"""
import os
import sys
import json
from dotenv import load_dotenv
from supabase import create_client
from collections import defaultdict

sys.path.append(os.getcwd())
load_dotenv()

from services.rag.pinecone_vector_service import PineconeVectorService

class ComprehensiveAuditor:
    def __init__(self):
        # Supabase 초기화
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_KEY')
        self.supabase = create_client(url, key)
        
        # Pinecone 초기화
        self.vector_service = PineconeVectorService()
        self.index = self.vector_service.index
        
        self.report = {
            'database': {},
            'pinecone': {},
            'integrity': {},
            'issues': []
        }
    
    def audit_database(self):
        """데이터베이스 전체 점검"""
        print("\n" + "="*60)
        print("📊 DATABASE AUDIT")
        print("="*60)
        
        # 주요 테이블 목록
        tables = [
            'users',
            'user_profiles', 
            'profile_analysis',
            'profile_vector',
            'chat_sessions',
            'chat_messages'
        ]
        
        for table_name in tables:
            try:
                print(f"\n🔍 Checking table: {table_name}")
                result = self.supabase.table(table_name).select('*').execute()
                data = result.data
                
                print(f"   ✅ Found {len(data)} rows")
                self.report['database'][table_name] = {
                    'row_count': len(data),
                    'sample': data[:2] if data else []
                }
                
                # 데이터 무결성 체크
                if table_name == 'profile_analysis':
                    self._check_profile_analysis(data)
                elif table_name == 'profile_vector':
                    self._check_profile_vector(data)
                elif table_name == 'user_profiles':
                    self._check_user_profiles(data)
                    
            except Exception as e:
                print(f"   ❌ Error: {e}")
                self.report['issues'].append(f"Table {table_name}: {str(e)}")
    
    def _check_user_profiles(self, data):
        """user_profiles 테이블 점검"""
        if not data:
            self.report['issues'].append("⚠️ user_profiles 테이블이 비어있습니다")
            return
        
        # 중복 user_id 체크
        user_ids = [row['user_id'] for row in data]
        duplicates = [uid for uid in set(user_ids) if user_ids.count(uid) > 1]
        
        if duplicates:
            self.report['issues'].append(f"⚠️ 중복된 user_id: {duplicates}")
        
        print(f"   - Total profiles: {len(data)}")
        print(f"   - Unique users: {len(set(user_ids))}")
    
    def _check_profile_analysis(self, data):
        """profile_analysis 테이블 점검"""
        if not data:
            self.report['issues'].append("⚠️ profile_analysis 테이블이 비어있습니다")
            return
        
        # 필수 필드 체크
        for row in data:
            profile_id = row.get('profile_id')
            if not row.get('personality'):
                self.report['issues'].append(f"⚠️ profile_id {profile_id}: personality 누락")
            if not row.get('mbti'):
                self.report['issues'].append(f"⚠️ profile_id {profile_id}: mbti 누락")
        
        print(f"   - Analyzed profiles: {len(data)}")
    
    def _check_profile_vector(self, data):
        """profile_vector 테이블 점검"""
        if not data:
            self.report['issues'].append("⚠️ profile_vector 테이블이 비어있습니다")
            return
        
        # vector_db_id 형식 체크
        for row in data:
            vector_id = row.get('vector_db_id')
            if not vector_id or not vector_id.startswith('user-'):
                self.report['issues'].append(f"⚠️ 잘못된 vector_db_id 형식: {vector_id}")
            
            if not row.get('original_text'):
                self.report['issues'].append(f"⚠️ vector_id {vector_id}: original_text 누락")
        
        print(f"   - Total vectors in DB: {len(data)}")
    
    def audit_pinecone(self):
        """Pinecone 벡터 DB 점검"""
        print("\n" + "="*60)
        print("🔮 PINECONE AUDIT")
        print("="*60)
        
        try:
            # 인덱스 통계
            stats = self.index.describe_index_stats()
            total_vectors = stats.total_vector_count
            
            print(f"\n📊 Index Statistics:")
            print(f"   - Total vectors: {total_vectors}")
            print(f"   - Dimension: {stats.dimension}")
            
            self.report['pinecone']['total_vectors'] = total_vectors
            self.report['pinecone']['dimension'] = stats.dimension
            
            if stats.dimension != 3072:
                self.report['issues'].append(f"⚠️ 잘못된 dimension: {stats.dimension} (expected: 3072)")
            
            # 사용자 벡터 샘플 조회
            print(f"\n🔍 Checking user vectors...")
            user_vectors = []
            for i in range(1, 5):  # user-1 ~ user-4 체크
                vector_id = f"user-{i}"
                try:
                    fetch_res = self.index.fetch(ids=[vector_id])
                    if vector_id in fetch_res.vectors:
                        vec = fetch_res.vectors[vector_id]
                        user_vectors.append({
                            'id': vector_id,
                            'dimension': len(vec.values),
                            'metadata': vec.metadata
                        })
                        print(f"   ✅ {vector_id}: dimension={len(vec.values)}, metadata={vec.metadata}")
                except Exception as e:
                    print(f"   ❌ {vector_id}: {e}")
            
            self.report['pinecone']['user_vectors'] = user_vectors
            
            # 직업/학과 벡터 샘플 조회
            print(f"\n🔍 Checking job/major vectors...")
            sample_ids = ['job_10043', 'job_994', 'dept_1']
            for vec_id in sample_ids:
                try:
                    fetch_res = self.index.fetch(ids=[vec_id])
                    if vec_id in fetch_res.vectors:
                        print(f"   ✅ {vec_id} exists")
                    else:
                        print(f"   ❌ {vec_id} not found")
                except Exception as e:
                    print(f"   ❌ {vec_id}: {e}")
                    
        except Exception as e:
            print(f"❌ Pinecone audit failed: {e}")
            self.report['issues'].append(f"Pinecone error: {str(e)}")
    
    def check_data_integrity(self):
        """DB ↔ Pinecone 데이터 일관성 체크"""
        print("\n" + "="*60)
        print("🔗 DATA INTEGRITY CHECK")
        print("="*60)
        
        try:
            # DB에서 profile_vector 조회
            db_vectors = self.supabase.table('profile_vector').select('vector_db_id, profile_id').execute().data
            
            print(f"\n📋 Checking DB ↔ Pinecone consistency...")
            print(f"   - Vectors in DB: {len(db_vectors)}")
            
            # Pinecone에 실제 존재하는지 확인
            missing_in_pinecone = []
            for row in db_vectors:
                vector_id = row['vector_db_id']
                try:
                    fetch_res = self.index.fetch(ids=[vector_id])
                    if vector_id not in fetch_res.vectors:
                        missing_in_pinecone.append(vector_id)
                        print(f"   ⚠️ {vector_id} exists in DB but not in Pinecone")
                except Exception as e:
                    print(f"   ❌ Error checking {vector_id}: {e}")
            
            if missing_in_pinecone:
                self.report['issues'].append(f"⚠️ DB에는 있지만 Pinecone에 없는 벡터: {missing_in_pinecone}")
            else:
                print(f"   ✅ All DB vectors exist in Pinecone")
            
            self.report['integrity']['db_pinecone_match'] = len(db_vectors) - len(missing_in_pinecone)
            
        except Exception as e:
            print(f"❌ Integrity check failed: {e}")
            self.report['issues'].append(f"Integrity check error: {str(e)}")
    
    def generate_report(self):
        """최종 리포트 생성"""
        print("\n" + "="*60)
        print("📝 AUDIT REPORT SUMMARY")
        print("="*60)
        
        print(f"\n✅ Database Tables Checked: {len(self.report['database'])}")
        print(f"✅ Pinecone Vectors: {self.report['pinecone'].get('total_vectors', 'N/A')}")
        
        if self.report['issues']:
            print(f"\n⚠️ Issues Found: {len(self.report['issues'])}")
            for issue in self.report['issues']:
                print(f"   - {issue}")
        else:
            print(f"\n✅ No issues found!")
        
        # JSON 리포트 저장
        report_path = 'audit_report.json'
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📄 Detailed report saved to: {report_path}")
        
        return self.report

def main():
    print("🚀 Starting DreamPath Comprehensive Audit...")
    
    auditor = ComprehensiveAuditor()
    
    # 1. 데이터베이스 점검
    auditor.audit_database()
    
    # 2. Pinecone 점검
    auditor.audit_pinecone()
    
    # 3. 데이터 일관성 체크
    auditor.check_data_integrity()
    
    # 4. 최종 리포트 생성
    auditor.generate_report()
    
    print("\n✅ Audit completed!")

if __name__ == "__main__":
    main()
