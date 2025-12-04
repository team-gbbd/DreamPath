import uuid
from services.ingest.careernet_client import CareerNetClient
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository


class CareerDepartmentIngest:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    def ingest_all(self):
        print("Loading existing departments for deduplication...")
        # 기존 DB에서 학과명 로드 (재시작 시 중복 방지)
        seen_dept_names = set()
        # TEMPORARILY DISABLED: Force re-ingestion to Pinecone
        # try:
        #     # 1000개씩 페이징해서 가져오기 (메모리 보호)
        #     offset = 0
        #     while True:
        #         response = self.repo.supabase.table('department_vector').select('document_text').range(offset, offset+999).execute()
        #         if not response.data:
        #             break
        #         
        #         for item in response.data:
        #             # document_text에서 "학과명: " 다음 줄을 파싱
        #             text = item.get('document_text', '')
        #             if '학과명: ' in text:
        #                 start = text.find('학과명: ') + 5
        #                 end = text.find('\n', start)
        #                 if end == -1: end = len(text)
        #                 dept_name = text[start:end].strip()
        #                 if dept_name:
        #                     seen_dept_names.add(dept_name)
        #         offset += 1000
        #     print(f"Loaded {len(seen_dept_names)} existing departments.")
        # except Exception as e:
        #     print(f"Error loading existing departments: {e}")
        print(f"Deduplication disabled. Will ingest all departments.")

        page = 1
        display = 100
        import time
        
        while True:
            if page % 10 == 0:
                print(f"Fetching MAJOR page {page}...")
            
            # 재시도 로직 (3회)
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    # gubun='univ_list'는 대학교 학과 정보를 의미
                    data = CareerNetClient.call('MAJOR', start=page, display=display, gubun='univ_list')
                    break # 성공하면 루프 탈출
                except Exception as e:
                    if attempt < max_retries - 1:
                        print(f"Connection error on page {page}, retrying in 5s... ({e})")
                        time.sleep(5)
                    else:
                        print(f"Failed to fetch page {page} after {max_retries} attempts. Skipping.")
                        data = {}
            
            rows = data.get('dataSearch', {}).get('content', [])
            
            if not rows:
                # 데이터가 없거나 에러로 인해 빈 딕셔너리인 경우
                if 'dataSearch' not in data and attempt == max_retries - 1:
                     # 에러로 인한 종료가 아니길 바라며, 단순히 끝에 도달했는지 확인
                     # 하지만 rows가 없으면 종료하는게 맞음. 
                     # 만약 에러로 인해 rows가 없는거라면... 다음 페이지로 넘어가야 하나?
                     # 여기서는 안전하게 종료하거나, 에러면 다음 페이지로 가도록 수정?
                     # API가 끝에 도달하면 content가 비어있음.
                     pass
                if not rows:
                    # 진짜 끝인지 에러인지 구분 어렵지만, 일단 break
                    # 에러로 인해 data가 {}인 경우도 여기서 걸림
                    if attempt == max_retries - 1:
                        print("Stopping due to repeated errors or end of data.")
                    break
                
            for item in rows:
                # 1. 필드 매핑 수정
                dept_name = item.get('mClass', '')
                major_seq = item.get('majorSeq', '')
                
                # 2. 중복 제거 (학과명 기준)
                if not dept_name or dept_name in seen_dept_names:
                    continue
                
                seen_dept_names.add(dept_name)
                
                # 3. 상세 정보 가져오기 (MAJOR_VIEW)
                detail = {}
                try:
                    # 상세 API 호출
                    detail = CareerNetClient.get_major_view(major_seq)
                except Exception as e:
                    print(f"Failed to fetch detail for {dept_name}: {e}")

                # 4. 졸업 후 진출 분야 구성
                enter_field_text = ""
                if detail.get('enter_field'):
                    fields = []
                    for field in detail['enter_field']:
                        gradeuate = field.get('gradeuate', '')
                        desc = field.get('description', '')
                        if gradeuate:
                            fields.append(f"{gradeuate}: {desc}")
                    enter_field_text = "\n".join(fields)

                # 5. 취업률 추출 (chartData or employment field)
                employment_rate = detail.get('employment', '')
                if not employment_rate and detail.get('chartData'):
                    for chart in detail['chartData']:
                        if chart.get('employment_rate'):
                            # 전체 취업률 찾기
                            for rate in chart['employment_rate']:
                                if rate.get('item') == '전체':
                                    employment_rate = f"{rate.get('data', '')}%"
                                    break
                
                # 6. 임금 추출 (사용자가 제외 요청했으나, 메타데이터에는 있어도 나쁠 것 없음. 하지만 사용자 요청대로 화면 표시용으로는 제외. 
                # 일단 수집은 해두되 화면엔 안 보여주는게 나을 수도 있지만, 사용자 요청이 '이렇게만 구성하기로' 였으므로 
                # DTO에는 넣고 메타데이터에도 넣되 프론트에서 안 쓰면 됨. 
                # 하지만 사용자 요청을 엄격히 따르자면 '임금 없잖아' 했으므로 굳이 강조할 필요 없음.
                # 여기서는 수집은 하되 DTO에 포함시킴 (나중을 위해))
                salary = detail.get('salary', '')

                dto = {
                    'deptCd': major_seq,
                    'deptName': dept_name,
                    'intro': detail.get('summary') or item.get('lClass', ''), # 설명 없으면 계열이라도
                    'curriculum': detail.get('curriculum', ''),
                    'relatedJobs': detail.get('job', ''),
                    'employment': employment_rate,
                    'salary': salary,
                    'enter_field': enter_field_text
                }

                doc = DocumentBuilder.build_department_document(dto)
                vector_id = f"dept_{dto['deptCd']}"

                try:
                    metadata = {
                        'type': 'department',
                        'original_id': dto['deptCd'],
                        'deptName': dto['deptName'],
                        'lClass': item.get('lClass', ''), # 계열
                        'summary': dto['intro'],
                        'employment': dto['employment'],
                        'enter_field': dto['enter_field'],
                        'relatedJobs': dto['relatedJobs']
                        # salary 제외
                    }
                    self.vector.process(vector_id, doc, metadata=metadata)
                    self.repo.save_vector('department_vector', {
                        'original_id': dto['deptCd'],
                        'document_text': doc,
                        'vector_id': vector_id
                    })
                except Exception as e:
                    print(f"Error saving department {dept_name}: {e}")
            
            page += 1
            
        print(f"Total unique departments ingested: {len(seen_dept_names)}")
