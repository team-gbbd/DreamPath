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
