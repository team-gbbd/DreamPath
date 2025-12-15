"""
채용공고 적합도 평가 서비스

AsyncOpenAI를 사용한 완전 비동기 처리
배치 병렬 처리로 성능 최적화
"""
import asyncio
import json
from typing import List, Dict
from openai import AsyncOpenAI


class JobFitnessService:
    """채용공고 적합도 AI 평가 서비스"""

    def __init__(self):
        self.client = AsyncOpenAI()
        self.batch_size = 10
        self.max_eval_count = 30

    async def evaluate_jobs(
        self,
        career_names: List[str],
        jobs: List[Dict]
    ) -> Dict[int, Dict]:
        """
        여러 채용공고를 병렬로 평가

        Args:
            career_names: 추천 직업 목록
            jobs: [{"title": str, "description": str}, ...]

        Returns:
            {index: evaluation_result, ...}
        """
        if not jobs or not career_names:
            return {}

        # 평가할 공고 준비 (최대 개수 제한)
        jobs_to_eval = jobs[:self.max_eval_count]

        # 배치로 나누기
        batches = [
            jobs_to_eval[i:i + self.batch_size]
            for i in range(0, len(jobs_to_eval), self.batch_size)
        ]

        # 모든 배치를 병렬 실행
        tasks = [
            self._evaluate_batch(career_names, batch, start_idx)
            for start_idx, batch in enumerate(batches)
        ]

        batch_results = await asyncio.gather(*tasks, return_exceptions=True)

        # 결과 병합
        results = {}
        for batch_idx, batch_result in enumerate(batch_results):
            if isinstance(batch_result, Exception):
                print(f"[JobFitness] 배치 {batch_idx} 실패: {batch_result}")
                # 실패한 배치는 기본값으로 채움
                start = batch_idx * self.batch_size
                for i in range(len(batches[batch_idx])):
                    results[start + i] = self._get_default_result(career_names)
            else:
                results.update(batch_result)

        print(f"[JobFitness] {len(results)}개 공고 평가 완료 (배치 {len(batches)}개 병렬 실행)")
        return results

    async def _evaluate_batch(
        self,
        career_names: List[str],
        batch: List[Dict],
        batch_idx: int
    ) -> Dict[int, Dict]:
        """단일 배치 평가"""
        if not batch:
            return {}

        start_idx = batch_idx * self.batch_size

        try:
            # 프롬프트 생성
            jobs_text = self._build_jobs_text(batch)
            prompt = self._build_prompt(career_names, jobs_text)

            # API 호출 (비동기)
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=2000
            )

            # 결과 파싱
            result_text = response.choices[0].message.content.strip()
            evaluations = self._parse_response(result_text)

            # 인덱스 매핑
            return {
                start_idx + i: eval_result
                for i, eval_result in enumerate(evaluations)
            }

        except Exception as e:
            print(f"[JobFitness] 배치 평가 실패: {e}")
            return {
                start_idx + i: self._get_default_result(career_names)
                for i in range(len(batch))
            }

    def _build_jobs_text(self, jobs: List[Dict]) -> str:
        """공고 목록 텍스트 생성"""
        lines = []
        for i, job in enumerate(jobs):
            title = job.get("title", "")
            desc = (job.get("description") or "")[:300]
            lines.append(f"[공고 {i+1}]\n- 제목: {title}\n- 설명: {desc or '없음'}")
        return "\n".join(lines)

    def _build_prompt(self, career_names: List[str], jobs_text: str) -> str:
        """평가 프롬프트 생성"""
        return f"""당신은 채용 전문가입니다. 사용자의 추천 직업 목록과 여러 채용공고를 비교하여 각각의 적합도를 평가해주세요.

추천 직업 목록: {', '.join(career_names)}

채용공고 목록:
{jobs_text}

각 공고에 대해 다음 JSON 배열 형식으로만 응답하세요:
[
  {{
    "index": 1,
    "is_relevant": true,
    "match_score": 75,
    "matched_career": "직업명",
    "reason": "적합 이유",
    "required_skills": ["스킬1", "스킬2"],
    "skill_match": ["매칭스킬"]
  }}
]

점수 기준:
- 직접 관련: 70-100점
- 간접 관련: 40-70점
- 관련 없음: 0-40점"""

    def _parse_response(self, text: str) -> List[Dict]:
        """API 응답 파싱"""
        # 마크다운 코드 블록 제거
        if text.startswith('```'):
            text = text.split('```')[1]
            if text.startswith('json'):
                text = text[4:]

        return json.loads(text.strip())

    def _get_default_result(self, career_names: List[str]) -> Dict:
        """기본 평가 결과"""
        return {
            "is_relevant": False,
            "match_score": 50,
            "matched_career": career_names[0] if career_names else "",
            "reason": "AI 평가 실패, 키워드 기반 추천",
            "required_skills": [],
            "skill_match": []
        }


# 싱글톤 인스턴스
_service = None

def get_job_fitness_service() -> JobFitnessService:
    """서비스 인스턴스 반환"""
    global _service
    if _service is None:
        _service = JobFitnessService()
    return _service
