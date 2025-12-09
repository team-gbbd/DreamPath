# Profile Dashboard UI 개선 구현 계획서

**작성일**: 2025-12-09  
**목적**: Personality Agent 데이터를 활용한 프로필 대시보드 UI 개선

---

## 📋 요구사항 분석

### 사용자 요청사항 (7가지)

| 번호 | 요청 내용 | 우선순위 |
|------|-----------|----------|
| 1 | 진로 로드맵 관련 내용 제외 | P1 |
| 2 | 누락된 데이터 UI 표시 (strengths, risks, goals, values) | P1 |
| 3 | 진로 로드맵/멘토링/학습 탭 제외하고 UI 개선 | P1 |
| 4 | 직업 추천 카드: 이미지 + 정보 레이아웃, 이미지는 "준비중입니다" | P1 |
| 5 | 직업 추천 카드: 직업 설명 → 추천 이유로 변경 | P1 |
| 6 | 학과 추천 카드: 이미지 + 정보 레이아웃, 이미지는 "준비중입니다" | P1 |
| 7 | 학과 추천 카드: 학과 설명 제거, 추천 이유 추가 | P1 |

---

## ⚠️ 잠재적 문제점 분석

### 1. 추천 이유 데이터 부재

**문제**:
- 현재 백엔드/AI 서비스에서 **추천 이유를 생성하지 않음**
- 벡터 검색 결과에는 `score` (일치도)만 있고, "왜 추천되는지" 설명이 없음

**영향**:
- 요청 5번, 7번 (추천 이유 표시)을 구현하려면 **추천 이유 생성 로직 필요**

**해결 방안**:
1. **임시 방안 (프론트엔드)**: Big Five 특성과 일치도를 기반으로 간단한 추천 이유 생성
2. **장기 방안 (백엔드)**: AI가 추천 이유를 생성하도록 API 수정

### 2. 이미지 데이터 부재

**문제**:
- 직업/학과 이미지가 데이터베이스에 없음
- "준비중입니다" 플레이스홀더만 표시 가능

**영향**:
- 시각적 완성도가 낮아질 수 있음

**해결 방안**:
1. **단기**: 아이콘 + "준비중입니다" 텍스트로 깔끔하게 디자인
2. **중기**: AI 이미지 생성 API 활용 (DALL-E, Midjourney)
3. **장기**: 직업/학과별 실제 이미지 수집 및 저장

### 3. 데이터 구조 불일치

**문제**:
- `analysisData.personality`에 `strengths`/`risks`가 저장되어 있지 않음
- 현재 `personalityNarrative.strengths`는 다른 데이터 구조를 참조

**영향**:
- 요청 2번 (누락된 데이터 표시)을 구현하려면 **데이터 흐름 수정 필요**

**해결 방안**:
1. **백엔드 수정**: `ProfileAnalysis` 엔티티에 `strengths`, `risks`, `goals`, `values` 컬럼 추가
2. **프론트엔드 수정**: API 응답 구조에 맞춰 데이터 파싱 로직 수정

### 4. UI 일관성 유지

**문제**:
- 직업/학과 카드 디자인을 변경하면 다른 탭과 스타일 불일치 가능

**영향**:
- 전체 UI의 통일성이 깨질 수 있음

**해결 방안**:
- 기존 `glass-card` 스타일을 유지하면서 내부 레이아웃만 변경
- 색상 팔레트와 폰트 크기를 일관되게 유지

---

## 💡 대안 아이디어 제시

### 아이디어 1: 추천 이유 자동 생성 (프론트엔드)

**현재 방식**:
```tsx
// 추천 이유 없음, 일치도만 표시
<span>{job.match}% 일치</span>
```

**제안 방식**:
```tsx
// Big Five 특성 기반 추천 이유 생성
const generateRecommendationReason = (job, bigFive) => {
  if (bigFive.openness > 70) {
    return "높은 개방성으로 창의적 업무에 적합합니다";
  }
  if (bigFive.conscientiousness > 70) {
    return "높은 성실성으로 체계적 업무에 강점이 있습니다";
  }
  return `${job.match}% 일치도로 추천되었습니다`;
};
```

**장점**:
- 백엔드 수정 없이 즉시 구현 가능
- 사용자에게 구체적인 피드백 제공

**단점**:
- 추천 이유가 단순하고 획일적일 수 있음

### 아이디어 2: 이미지 플레이스홀더 디자인 개선

**현재 방식**:
```tsx
<div>준비중입니다</div>
```

**제안 방식 A (아이콘 + 그라데이션)**:
```tsx
<div className="bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
  <Briefcase size={48} className="text-indigo-400" />
  <p className="text-xs text-gray-500 mt-2">이미지 준비중</p>
</div>
```

**제안 방식 B (직업/학과 이니셜)**:
```tsx
<div className="bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
  <span className="text-4xl font-bold text-white">
    {job.title[0]} {/* 첫 글자 */}
  </span>
</div>
```

**제안 방식 C (카테고리별 색상)**:
```tsx
// IT: 파란색, 의료: 초록색, 예술: 보라색
<div className={`bg-gradient-to-br ${getCategoryColor(job.category)}`}>
  <Icon name={getCategoryIcon(job.category)} />
</div>
```

**추천**: **방식 A** (아이콘 + 그라데이션)
- 깔끔하고 전문적
- 카테고리별 아이콘 사용 가능

### 아이디어 3: 카드 레이아웃 옵션

**옵션 A: 좌측 이미지 + 우측 정보 (가로 배치)**
```
┌─────────────────────────────┐
│ [이미지]  │  직업명          │
│           │  추천 이유       │
│           │  일치도: 85%     │
└─────────────────────────────┘
```

**옵션 B: 상단 이미지 + 하단 정보 (세로 배치)** ← **사용자 요청**
```
┌─────────────────────────────┐
│        [이미지]              │
├─────────────────────────────┤
│  직업명                      │
│  추천 이유                   │
│  일치도: 85%                 │
└─────────────────────────────┘
```

**옵션 C: 오버레이 방식**
```
┌─────────────────────────────┐
│        [이미지]              │
│  ┌─────────────────────┐    │
│  │ 직업명              │    │
│  │ 추천 이유           │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

**추천**: **옵션 B** (사용자 요청과 일치)
- 이미지가 눈에 잘 띔
- 정보 가독성 우수

### 아이디어 4: Strengths/Risks 표시 방식

**옵션 A: 태그 형식 (현재 제안)**
```tsx
<div className="flex flex-wrap gap-2">
  {strengths.map(s => (
    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full">
      {s}
    </span>
  ))}
</div>
```

**옵션 B: 리스트 형식**
```tsx
<ul className="space-y-2">
  {strengths.map(s => (
    <li className="flex items-start">
      <Check className="text-green-500 mr-2" />
      <span>{s}</span>
    </li>
  ))}
</ul>
```

**옵션 C: 카드 형식**
```tsx
{strengths.map(s => (
  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
    <p className="font-medium">{s}</p>
  </div>
))}
```

**추천**: **옵션 A** (태그 형식)
- 공간 효율적
- 시각적으로 깔끔
- 여러 개를 한눈에 볼 수 있음

---

## 🎯 최종 구현 계획

### Phase 1: 데이터 구조 확인 및 수정 (선행 작업)

#### 1.1 백엔드 데이터 구조 확인
- [ ] `ProfileAnalysis` 엔티티에 `strengths`, `risks`, `goals`, `values` 필드 존재 여부 확인
- [ ] API 응답 구조 확인 (`/api/profiles/{userId}/analysis`)

#### 1.2 프론트엔드 데이터 파싱 로직 수정
- [ ] `analysisData` 타입 정의 업데이트
- [ ] `strengths`, `risks`, `goals`, `values` 데이터 추출 로직 추가

### Phase 2: Dashboard 탭 개선

#### 2.1 Goals & Values 섹션 추가
**위치**: "나의 진로 요약" 카드 내부

**디자인**:
```tsx
{/* Goals Section */}
<div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
  <h4 className="text-sm font-bold text-indigo-700 mb-2 flex items-center gap-2">
    <Target size={16} />
    나의 목표
  </h4>
  <ul className="space-y-1">
    {goals.map((goal, idx) => (
      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
        <span className="text-indigo-500">•</span>
        {goal}
      </li>
    ))}
  </ul>
</div>

{/* Values Section */}
<div className="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
  <h4 className="text-sm font-bold text-purple-700 mb-2 flex items-center gap-2">
    <Heart size={16} />
    핵심 가치
  </h4>
  <div className="flex flex-wrap gap-2">
    {values.map((value, idx) => (
      <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
        {value}
      </span>
    ))}
  </div>
</div>
```

#### 2.2 TOP 3 추천 카드 유지
- 기존 디자인 유지 (변경 없음)
- Jobs/Majors 탭에서만 상세 카드 디자인 변경

### Phase 3: Personality 탭 개선

#### 3.1 Strengths & Risks 카드 추가
**위치**: MBTI Insights 카드 아래

**디자인**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Strengths Card */}
  <div className={styles['glass-card']}>
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
        <Check size={20} className="text-green-600" />
      </div>
      <h3 className="text-lg font-bold text-slate-800">나의 강점</h3>
    </div>
    <div className="flex flex-wrap gap-2">
      {strengths.map((strength, idx) => (
        <span key={idx} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
          {strength}
        </span>
      ))}
    </div>
  </div>

  {/* Risks Card */}
  <div className={styles['glass-card']}>
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center">
        <AlertCircle size={20} className="text-amber-600" />
      </div>
      <h3 className="text-lg font-bold text-slate-800">주의할 점</h3>
    </div>
    <div className="flex flex-wrap gap-2">
      {risks.map((risk, idx) => (
        <span key={idx} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium border border-amber-200">
          {risk}
        </span>
      ))}
    </div>
  </div>
</div>
```

### Phase 4: Jobs 탭 개선

#### 4.1 추천 이유 생성 함수
```tsx
const generateJobRecommendationReason = (job: any, bigFive: any, strengths: string[]) => {
  const reasons = [];
  
  // Big Five 기반 추천 이유
  if (bigFive?.openness > 70 && job.metadata?.creativity_required) {
    reasons.push("높은 개방성으로 창의적 업무에 적합");
  }
  if (bigFive?.conscientiousness > 70) {
    reasons.push("높은 성실성으로 체계적 업무 수행 가능");
  }
  if (bigFive?.extraversion > 70 && job.metadata?.teamwork_required) {
    reasons.push("외향적 성향으로 팀워크 업무에 강점");
  }
  
  // Strengths 기반 추천 이유
  if (strengths.includes("빠른 학습") && job.metadata?.learning_curve === "high") {
    reasons.push("빠른 학습 능력으로 신기술 습득 유리");
  }
  
  // 기본 추천 이유
  if (reasons.length === 0) {
    reasons.push(`${Math.round((job.score || 0) * 100)}% 일치도로 추천`);
  }
  
  return reasons[0]; // 가장 관련성 높은 이유 1개 반환
};
```

#### 4.2 직업 카드 디자인
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {jobs.map((job, index) => (
    <div key={index} className={styles['glass-card']} onClick={() => handleJobClick(job)}>
      {/* 이미지 영역 */}
      <div className="relative h-48 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex flex-col items-center justify-center mb-4">
        <Briefcase size={48} className="text-indigo-400 mb-2" />
        <p className="text-xs text-gray-500">이미지 준비중</p>
      </div>
      
      {/* 정보 영역 */}
      <div className="space-y-3">
        {/* 직업명 + 일치도 */}
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-slate-800 flex-1">
            {job.title || job.metadata?.jobName || '직업'}
          </h3>
          <span className="text-sm font-bold text-indigo-600 ml-2">
            {Math.round((job.score || 0) * 100)}%
          </span>
        </div>
        
        {/* 카테고리 태그 */}
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium">
            {job.metadata?.job_category || '직업'}
          </span>
        </div>
        
        {/* 추천 이유 */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
          <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
            <Lightbulb size={14} />
            추천 이유
          </p>
          <p className="text-sm text-slate-700">
            {generateJobRecommendationReason(job, bigFive, strengths)}
          </p>
        </div>
      </div>
    </div>
  ))}
</div>
```

### Phase 5: Majors 탭 개선

#### 5.1 추천 이유 생성 함수
```tsx
const generateMajorRecommendationReason = (major: any, bigFive: any, goals: string[]) => {
  const reasons = [];
  
  // Big Five 기반
  if (bigFive?.openness > 70 && major.metadata?.field === "예술") {
    reasons.push("높은 개방성으로 창의적 학문에 적합");
  }
  if (bigFive?.conscientiousness > 70 && major.metadata?.field === "공학") {
    reasons.push("높은 성실성으로 체계적 학습에 강점");
  }
  
  // Goals 기반
  if (goals.includes("개발자") && major.metadata?.field === "컴퓨터공학") {
    reasons.push("개발자 목표와 직접적으로 연결된 학과");
  }
  
  // 기본
  if (reasons.length === 0) {
    reasons.push(`${Math.round((major.score || 0) * 100)}% 일치도로 추천`);
  }
  
  return reasons[0];
};
```

#### 5.2 학과 카드 디자인
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {majors.map((major, index) => (
    <div key={index} className={styles['glass-card']} onClick={() => handleMajorClick(major)}>
      {/* 이미지 영역 */}
      <div className="relative h-48 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex flex-col items-center justify-center mb-4">
        <GraduationCap size={48} className="text-green-400 mb-2" />
        <p className="text-xs text-gray-500">이미지 준비중</p>
      </div>
      
      {/* 정보 영역 */}
      <div className="space-y-3">
        {/* 학과명 + 일치도 */}
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-slate-800 flex-1">
            {major.title || major.metadata?.deptName || '학과'}
          </h3>
          <span className="text-sm font-bold text-green-600 ml-2">
            {Math.round((major.score || 0) * 100)}%
          </span>
        </div>
        
        {/* 카테고리 태그 */}
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-medium">
            {major.metadata?.lClass || major.metadata?.field || '학과'}
          </span>
          {major.metadata?.category && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
              {major.metadata.category}
            </span>
          )}
        </div>
        
        {/* 추천 이유 */}
        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
          <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
            <Lightbulb size={14} />
            추천 이유
          </p>
          <p className="text-sm text-slate-700">
            {generateMajorRecommendationReason(major, bigFive, goals)}
          </p>
        </div>
      </div>
    </div>
  ))}
</div>
```

---

## 🚨 구현 전 확인 필요 사항

### 1. 데이터 구조 확인
- [ ] `analysisData`에 `strengths`, `risks`, `goals`, `values` 포함 여부
- [ ] 데이터가 없다면 백엔드 수정 필요

### 2. Big Five 데이터 접근
- [ ] `analysisData.personality`에서 Big Five 점수 추출 가능 여부
- [ ] 추천 이유 생성에 사용할 수 있는지 확인

### 3. 추천 데이터 구조
- [ ] `job.metadata`에 어떤 필드가 있는지 확인
- [ ] `major.metadata`에 어떤 필드가 있는지 확인

---

## 📊 구현 우선순위

| 우선순위 | 작업 | 예상 시간 | 의존성 |
|----------|------|-----------|--------|
| **P0** | 데이터 구조 확인 | 30분 | 없음 |
| **P1** | Strengths/Risks 카드 추가 | 1시간 | P0 완료 |
| **P1** | Goals/Values 섹션 추가 | 1시간 | P0 완료 |
| **P2** | 직업 카드 재디자인 | 2시간 | P1 완료 |
| **P2** | 학과 카드 재디자인 | 2시간 | P1 완료 |
| **P3** | 추천 이유 생성 로직 고도화 | 1시간 | P2 완료 |

**총 예상 시간**: 7.5시간

---

## ✅ 최종 권장사항

### 즉시 진행 가능한 작업
1. ✅ **Strengths/Risks 카드 추가** (데이터만 있으면 즉시 가능)
2. ✅ **Goals/Values 섹션 추가** (데이터만 있으면 즉시 가능)
3. ✅ **직업/학과 카드 레이아웃 변경** (즉시 가능)
4. ✅ **이미지 플레이스홀더 디자인** (즉시 가능)

### 데이터 확인 후 진행
5. ⚠️ **추천 이유 생성** (Big Five 데이터 접근 확인 필요)

### 개선 제안
- **이미지 플레이스홀더**: 아이콘 + 그라데이션 방식 (방식 A)
- **Strengths/Risks 표시**: 태그 형식 (옵션 A)
- **추천 이유**: Big Five + Strengths/Goals 조합

---

## 🎨 디자인 미리보기

### 직업 카드
![직업 카드 예시](/Users/kkj/.gemini/antigravity/brain/f3738e2d-cd32-4bf7-b4e8-93e702460b19/uploaded_image_0_1765261941009.png)

### 학과 카드
![학과 카드 예시](/Users/kkj/.gemini/antigravity/brain/f3738e2d-cd32-4bf7-b4e8-93e702460b19/uploaded_image_1_1765261941009.png)

---

## 📝 구현 후 검증 체크리스트

- [ ] Strengths/Risks가 Personality 탭에 표시되는가?
- [ ] Goals/Values가 Dashboard 탭에 표시되는가?
- [ ] 직업 카드가 이미지 + 정보 레이아웃인가?
- [ ] 학과 카드가 이미지 + 정보 레이아웃인가?
- [ ] 추천 이유가 의미 있게 표시되는가?
- [ ] 전체 UI 스타일이 일관성 있는가?
- [ ] 모바일 반응형이 잘 작동하는가?
