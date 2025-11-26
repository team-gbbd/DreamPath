class DocumentTemplate:
    """
    DreamPath RAG 시스템에서 사용하는 모든 문서(Document) 템플릿을 정의합니다.
    각 템플릿은 벡터 임베딩을 생성하기 위한 원본 텍스트 구조입니다.
    """

    @staticmethod
    def profile_template(profile):
        """
        사용자 성향 프로필 Document Template
        """
        return f"""
[사용자 성향 프로필]

성격 특성:
{profile.get("personalityTraits", "")}

가치관:
{profile.get("values", "")}

감정 패턴:
{profile.get("emotions", "")}

관심사:
{profile.get("interests", "")}

AI 정체성 인사이트:
{profile.get("identity", "")}
        """.strip()

    @staticmethod
    def ncs_template(ncs):
        """
        NCS 직무 Document Template
        """
        return f"""
[NCS 직무 정보]

대분류: {ncs.get("ncsLclasCdnm", "")}
직무명: {ncs.get("dutyNm", "")}
직무정의: {ncs.get("dutyDef", "")}

자율성 및 책임성:
{ncs.get("autoResp", "")}

수행 업무:
{ncs.get("dutyAcarr", "")}

필요 교육/훈련:
{ncs.get("dutyEduTrain", "")}

필요 자격증:
{ncs.get("dutyQualf", "")}

필요 경력:
{ncs.get("dutyCarr", "")}
        """.strip()

    @staticmethod
    def job_template(job):
        """
        직업백과 직업 Document Template
        """
        return f"""
[직업백과 직업 정보]

직업명: {job.get("jobNm", "")}
하는 일:
{job.get("jobDesc", "")}

작업 환경:
{job.get("workEnv", "")}

필요 능력:
{job.get("abilities", "")}

관련 전공:
{job.get("relatedMajors", "")}

관련 자격증:
{job.get("licenses", "")}
        """.strip()

    @staticmethod
    def department_template(dep):
        """
        학과 정보 Document Template
        """
        return f"""
[학과 정보]

학과명: {dep.get("deptNm", "")}

전공 설명:
{dep.get("desc", "")}

배우는 과목:
{dep.get("subjects", "")}

관련 직업:
{dep.get("relatedJobs", "")}
        """.strip()

    @staticmethod
    def school_template(school):
        """
        학교 정보 Document Template
        """
        return f"""
[학교 정보]

학교명: {school.get("schoolNm", "")}

학교 유형: {school.get("type", "")}
지역: {school.get("region", "")}

학교 소개:
{school.get("desc", "")}

특색 프로그램:
{school.get("programs", "")}
        """.strip()

    @staticmethod
    def case_template(case):
        """
        진로 상담 사례 Document Template
        """
        return f"""
[진로 상담 사례]

사례 제목:
{case.get("title", "")}

상담 내용:
{case.get("content", "")}

문제 요약:
{case.get("issue", "")}

상담 결과:
{case.get("result", "")}
        """.strip()

    # ============================================================
    #  DocumentBuilder 호환용 build_* 래퍼 메서드들
    # ============================================================
    @staticmethod
    def build_profile(data):
        return DocumentTemplate.profile_template(data)

    @staticmethod
    def build_ncs(data):
        return DocumentTemplate.ncs_template(data)

    @staticmethod
    def build_job(data):
        return DocumentTemplate.job_template(data)

    @staticmethod
    def build_department(data):
        return DocumentTemplate.department_template(data)

    @staticmethod
    def build_school(data):
        return DocumentTemplate.school_template(data)

    @staticmethod
    def build_case(data):
        return DocumentTemplate.case_template(data)
