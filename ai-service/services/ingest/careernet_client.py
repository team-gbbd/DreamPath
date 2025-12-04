import requests

class CareerNetClient:

    API_KEY = '6cb0f6894242191036656369ada53be0'
    BASE_URL = 'https://www.career.go.kr/cnet/openapi/getOpenApi.json'
    JOB_LIST_URL = 'https://www.career.go.kr/cnet/front/openapi/jobs.json'

    @staticmethod
    def job_list():
        params = { 'apiKey': CareerNetClient.API_KEY }
        return requests.get(CareerNetClient.JOB_LIST_URL, params=params).json()

    @staticmethod
    def call(category, start=1, display=200, **kwargs):
        """
        CareerNet API 호출
        
        Args:
            category: API 카테고리 (JOB, MAJOR, COUNSEL 등)
            start: 시작 페이지 (기본값: 1)
            display: 페이지당 결과 수 (기본값: 200)
            **kwargs: 추가 파라미터 (예: gubun='univ_list')
        """
        params = {
            'apiKey': CareerNetClient.API_KEY,
            'svcType': 'api',
            'svcCode': category,
            'contentType': 'json',
            'perPage': display,
            'thisPage': start
        }
        # 추가 파라미터 병합
        params.update(kwargs)
        return requests.get(CareerNetClient.BASE_URL, params=params).json()

    def get_major_list(self, page_index=1, page_size=200, gubun=None):
        params = {}
        if gubun:
            params['gubun'] = gubun
        response = self.call('MAJOR', start=page_index, display=page_size, **params)
        return response.get('dataSearch', {}).get('content', [])

    def get_job_list(self, page_index=1, page_size=200):
        response = self.call('JOB', start=page_index, display=page_size)
        return response.get('dataSearch', {}).get('content', [])

    @staticmethod
    def get_major_view(major_seq, gubun='univ_list'):
        """
        학과 상세 정보 조회 (MAJOR_VIEW)
        """
        params = {
            'apiKey': CareerNetClient.API_KEY, # Static access
            'svcType': 'api',
            'svcCode': 'MAJOR_VIEW',
            'contentType': 'json',
            'majorSeq': major_seq,
            'gubun': gubun
        }
        try:
            response = requests.get(CareerNetClient.BASE_URL, params=params).json()
            # 응답 구조가 dataSearch가 아니라 바로 root에 있는 경우가 있음
            # 또는 dataSearch.content[0]
            if 'dataSearch' in response and 'content' in response['dataSearch']:
                content = response['dataSearch']['content']
                if content:
                    return content[0]
            return {}
        except Exception:
            return {}
