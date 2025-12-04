from .document_template import DocumentTemplate


class DocumentBuilder:
    """
    모든 원시 데이터를 받아 document 텍스트를 조립하는 빌더.
    템플릿은 DocumentTemplate에서 관리.
    """

    @staticmethod
    def build_profile_document(profile):
        return DocumentTemplate.build_profile(profile)

    @staticmethod
    def build_ncs_document(ncs):
        """
        ncs: {
            "dutyName": "",
            "dutyDesc": "",
            "jobTask": "",
            "autonomy": "",
            "responsibility": "",
            "requiredMajor": "",
            "requiredCert": "",
            "requiredEdu": "",
            "requiredCareer": ""
        }
        """
        return DocumentTemplate.build_ncs(ncs)

    @staticmethod
    def build_job_document(job):
        """
        job: {
            "jobName": "",
            "jobDesc": "",
            "jobEnv": "",
            "jobValues": "",
            "jobAbilities": "",
            "majorRequired": "",
            "employmentPath": ""
        }
        """
        return DocumentTemplate.build_job(job)

    @staticmethod
    def build_department_document(dept):
        """
        dept: {
            "deptName": "",
            "deptDesc": "",
            "requiredSkills": "",
            "curriculum": "",
            "jobPath": ""
        }
        """
        return DocumentTemplate.build_department(dept)

    @staticmethod
    def build_school_document(school):
        """
        school: {
            "schoolName": "",
            "schoolType": "",
            "location": "",
            "desc": ""
        }
        """
        return DocumentTemplate.build_school(school)

    @staticmethod
    def build_case_document(case):
        """
        case: {
            "title": "",
            "summary": "",
            "situation": "",
            "counsel": "",
            "result": ""
        }
        """
        return DocumentTemplate.build_case(case)
    @staticmethod
    def build_ncs_fallback_document(job: dict, cases: list, job_desc: str) -> str:
        """
        Combine job, related cases, and job description into a single text
        that will be fed to the LLM for NCS generation.

        Args:
            job: CareerNet JOB dict (contains fields like 'job_code', 'job', etc.)
            cases: List of CareerNet CASE dicts related to the job (may be empty)
            job_desc: Short description/summary of the job (e.g., from job['summary'])

        Returns:
            A single string containing all information.
        """
        parts = []
        # 기본 직업 정보
        parts.append(f"Job Name: {job.get('job', '')}\nJob Code: {job.get('job_code', '')}\nDescription: {job_desc}\n")
        # 관련 상담 사례를 나열
        if cases:
            parts.append("Related Cases:\n")
            for idx, case in enumerate(cases, 1):
                title = case.get('title') or case.get('memo') or ''
                summary = case.get('summary') or case.get('memo') or ''
                parts.append(f"Case {idx}: {title}\n{summary}\n")
        else:
            parts.append("No related cases found.\n")
        return "\n".join(parts)

        return "\n".join(parts)

    @staticmethod
    def build_ncs_ability_document(ncs):
        """
        ncs: {
            "compeUnitName": "",
            "compeUnitLevel": "",
            "ncsLclasCdnm": "",
            "ncsMclasCdnm": "",
            "ncsSclasCdnm": "",
            "ncsSubdCdnm": "",
            "compeUnitDef": ""
        }
        """
        return DocumentTemplate.build_ncs_ability(ncs)
