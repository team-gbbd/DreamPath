import os
import sys
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir, os.pardir))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from services.vector.supabase_vector_repository import SupabaseVectorRepository
from pinecone import Pinecone

def deduplicate_departments():
    """학과명 기준으로 중복 제거"""
    
    print("="*70)
    print("학과 데이터 중복 제거 (학과명 기준)")
    print("="*70)
    
    repo = SupabaseVectorRepository()
    pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
    index = pc.Index('dreampath')
    
    # 1. 모든 학과 데이터 가져오기
    print("\n1. 학과 데이터 조회 중...")
    response = repo.supabase.table('department_vector').select('*').execute()
    all_departments = response.data
    
    print(f"   총 레코드 수: {len(all_departments)}개")
    
    # 2. 학과명 추출 및 그룹화
    print("\n2. 학과명 기준으로 그룹화 중...")
    dept_groups = defaultdict(list)
    
    for dept in all_departments:
        # document_text에서 학과명 추출
        doc_text = dept.get('document_text', '')
        
        # "학과명: XXX" 패턴에서 학과명 추출
        # 간단한 방법: original_id를 학과명으로 사용 (facilName)
        # 또는 document_text 파싱
        
        # 여기서는 original_id를 키로 사용 (이미 학과별로 구분됨)
        # 실제로는 facilName을 추출해야 하지만, API 응답이 부실해서
        # original_id가 학교별로 다르므로 이 방법으로는 중복이 없음
        
        # 대신 document_text에서 학과명을 추출해야 함
        # 하지만 현재 document_text가 거의 비어있음
        
        # 임시 방안: original_id 기준으로 그룹화 (실제 중복 확인)
        original_id = dept.get('original_id', '')
        dept_groups[original_id].append(dept)
    
    # 3. 중복 찾기
    print("\n3. 중복 데이터 찾기...")
    duplicates_to_delete = []
    total_duplicates = 0
    
    for original_id, depts in dept_groups.items():
        if len(depts) > 1:
            # 중복 발견! 첫 번째만 남기고 나머지 삭제
            total_duplicates += len(depts) - 1
            # ID가 가장 작은 것(가장 먼저 수집된 것) 남기고 나머지 삭제
            depts_sorted = sorted(depts, key=lambda x: x['id'])
            duplicates_to_delete.extend(depts_sorted[1:])
    
    print(f"   중복 그룹 수: {sum(1 for d in dept_groups.values() if len(d) > 1)}개")
    print(f"   삭제할 중복 레코드: {len(duplicates_to_delete)}개")
    
    if len(duplicates_to_delete) == 0:
        print("\n✅ 중복 데이터가 없습니다!")
        print("\n💡 참고: original_id 기준으로는 중복이 없습니다.")
        print("   학과명 기준 중복 제거를 위해서는 document_text 파싱이 필요합니다.")
        print("   하지만 현재 document_text가 거의 비어있어서 학과명 추출이 불가능합니다.")
        return
    
    # 4. 사용자 확인
    print(f"\n⚠️  {len(duplicates_to_delete)}개의 중복 레코드를 삭제하시겠습니까?")
    print("   (Supabase + Pinecone 양쪽 모두에서 삭제됩니다)")
    confirm = input("   계속하려면 'yes' 입력: ")
    
    if confirm.lower() != 'yes':
        print("\n❌ 작업이 취소되었습니다.")
        return
    
    # 5. Supabase에서 삭제
    print("\n4. Supabase에서 중복 삭제 중...")
    for dept in duplicates_to_delete:
        repo.supabase.table('department_vector').delete().eq('id', dept['id']).execute()
    print(f"   ✓ {len(duplicates_to_delete)}개 삭제 완료")
    
    # 6. Pinecone에서 삭제
    print("\n5. Pinecone에서 중복 삭제 중...")
    vector_ids = [dept['vector_id'] for dept in duplicates_to_delete]
    
    # 배치로 삭제 (1000개씩)
    for i in range(0, len(vector_ids), 1000):
        batch = vector_ids[i:i+1000]
        index.delete(ids=batch)
        print(f"   ✓ {len(batch)}개 삭제 ({i+len(batch)}/{len(vector_ids)})")
    
    print("\n" + "="*70)
    print("✅ 중복 제거 완료!")
    print("="*70)
    print(f"삭제된 레코드: {len(duplicates_to_delete)}개")
    print(f"남은 레코드: {len(all_departments) - len(duplicates_to_delete)}개")
    print("="*70)

if __name__ == '__main__':
    deduplicate_departments()
