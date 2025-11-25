import requests

# Get a company with the most data
response = requests.get("http://localhost:8000/api/company/list", params={"site_name": "wanted", "page": 1, "page_size": 10})

if response.status_code == 200:
    companies = response.json().get('companies', [])

    print("현재 저장된 기업정보 필드 현황:\n")
    print("=" * 80)

    # Count which fields have data
    field_counts = {
        'company_name': 0,
        'industry': 0,
        'established_year': 0,
        'employee_count': 0,
        'location': 0,
        'address': 0,
        'description': 0,
        'vision': 0,
        'benefits': 0,
        'culture': 0,
        'average_salary': 0,
        'homepage_url': 0,
        'recruitment_url': 0,
        'logo_url': 0
    }

    total = len(companies)

    for company in companies:
        for field in field_counts.keys():
            if company.get(field):
                field_counts[field] += 1

    print(f"총 {total}개 기업 분석 결과:\n")

    field_names = {
        'company_name': '회사명',
        'industry': '업종',
        'established_year': '설립연도',
        'employee_count': '직원수',
        'location': '위치',
        'address': '주소',
        'description': '회사소개',
        'vision': '비전/미션',
        'benefits': '복지/혜택',
        'culture': '기업문화',
        'average_salary': '평균연봉',
        'homepage_url': '홈페이지',
        'recruitment_url': '채용공고',
        'logo_url': '로고'
    }

    for field, count in field_counts.items():
        percentage = (count / total * 100) if total > 0 else 0
        status = "✅" if percentage > 70 else "⚠️" if percentage > 30 else "❌"
        print(f"{status} {field_names[field]:12} : {count:2}/{total} ({percentage:5.1f}%)")

    # Show a sample company with most data
    print("\n" + "=" * 80)
    print("샘플 기업 상세 정보:")
    print("=" * 80)

    # Find company with most fields
    best_company = max(companies, key=lambda c: sum(1 for v in c.values() if v))

    print(f"\n회사명: {best_company.get('company_name')}")
    for field, name in field_names.items():
        if field != 'company_name':
            value = best_company.get(field)
            if value:
                if len(str(value)) > 60:
                    print(f"{name:12} : {str(value)[:60]}...")
                else:
                    print(f"{name:12} : {value}")
            else:
                print(f"{name:12} : (없음)")

else:
    print(f"에러: {response.status_code}")
