import requests

API_KEY = '6cb0f6894242191036656369ada53be0'


class CareerNetClient:

    BASE_URL = 'https://www.career.go.kr/cnet/openapi/getOpenApi.json'
    JOB_LIST_URL = 'https://www.career.go.kr/cnet/front/openapi/jobs.json'

    @staticmethod
    def job_list():
        params = { 'apiKey': API_KEY }
        return requests.get(CareerNetClient.JOB_LIST_URL, params=params).json()

    @staticmethod
    def call(category, start=1, display=200):
        params = {
            'apiKey': API_KEY,
            'svcType': 'api',
            'svcCode': category,
            'contentType': 'json',
            'perPage': display,
            'page': start
        }
        return requests.get(CareerNetClient.BASE_URL, params=params).json()
