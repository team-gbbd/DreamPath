"""
AI 에이전트 관련 Pydantic 모델
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from enum import Enum


# ============== Enums ==============

class DifficultyLevel(str, Enum):
    """난이도"""
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class ResourceType(str, Enum):
    """학습 자료 타입"""
    COURSE = "COURSE"
    CERTIFICATION = "CERTIFICATION"
    PROJECT = "PROJECT"
    BOOK = "BOOK"


class Priority(str, Enum):
    """우선순위"""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class SkillLevel(str, Enum):
    """스킬 레벨"""
    NONE = "NONE"
    BASIC = "BASIC"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"
    EXPERT = "EXPERT"


class ResumeSection(str, Enum):
    """이력서 섹션"""
    SUMMARY = "SUMMARY"
    EXPERIENCE = "EXPERIENCE"
    SKILLS = "SKILLS"
    PROJECTS = "PROJECTS"
    EDUCATION = "EDUCATION"


# ============== 1. 채용 공고 추천 ==============

class JobRecommendationRequest(BaseModel):
    """채용 공고 추천 요청"""
    userId: int
    careerAnalysis: Dict
    userProfile: Optional[Dict] = None
    limit: int = Field(default=10, ge=1, le=50)


class JobRecommendation(BaseModel):
    """추천 채용 공고"""
    jobId: str
    title: str
    company: str
    location: Optional[str] = None
    url: str
    description: Optional[str] = None
    siteName: str
    matchScore: int = Field(ge=0, le=100)
    reasons: List[str]
    strengths: Optional[List[str]] = []
    concerns: Optional[List[str]] = []


class JobRecommendationResponse(BaseModel):
    """채용 공고 추천 응답"""
    recommendations: List[JobRecommendation]
    totalCount: int


class RealTimeRecommendationRequest(BaseModel):
    """실시간 추천 요청"""
    userId: int
    careerKeywords: List[str]
    limit: int = Field(default=5, ge=1, le=20)


# ============== 2. 지원 현황 추적 ==============

class ApplicationStatus(str, Enum):
    """지원 상태"""
    INTERESTED = "INTERESTED"
    APPLIED = "APPLIED"
    SCREENING = "SCREENING"
    INTERVIEW = "INTERVIEW"
    OFFER = "OFFER"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class Application(BaseModel):
    """지원 내역"""
    applicationId: int
    userId: int
    jobTitle: str
    company: str
    status: ApplicationStatus
    appliedAt: str
    lastUpdated: Optional[str] = None
    notes: Optional[str] = None


class ApplicationStatistics(BaseModel):
    """지원 통계"""
    total: int
    byStatus: Dict[str, int]
    screeningRate: float
    interviewRate: float
    offerRate: float
    rejectionRate: float


class NextAction(BaseModel):
    """다음 액션"""
    type: str  # FOLLOW_UP, PREPARE, etc.
    priority: Priority
    company: str
    jobTitle: str
    message: str
    suggestedAction: str


class ApplicationAnalysisRequest(BaseModel):
    """지원 현황 분석 요청"""
    userId: int


class ApplicationAnalysisResponse(BaseModel):
    """지원 현황 분석 응답"""
    totalApplications: int
    statistics: ApplicationStatistics
    insights: List[str]
    nextActions: List[NextAction]
    applications: Optional[List[Application]] = []


class StatusAdvice(BaseModel):
    """상태별 조언"""
    nextStep: str
    timeline: str
    tip: str


class ApplicationTrackingRequest(BaseModel):
    """지원 추적 요청"""
    userId: int
    applicationId: int
    currentStatus: ApplicationStatus


class ApplicationTrackingResponse(BaseModel):
    """지원 추적 응답"""
    advice: StatusAdvice


# ============== 3. 커리어 성장 제안 ==============

class GapAnalysis(BaseModel):
    """갭 분석"""
    missingSkills: List[str]
    missingExperience: List[str]
    estimatedTimeYears: float
    difficultyLevel: DifficultyLevel


class GrowthStep(BaseModel):
    """성장 단계"""
    step: int
    title: str
    description: str
    duration: str
    milestones: List[str]


class RecommendedResource(BaseModel):
    """추천 자료"""
    type: ResourceType
    title: str
    description: str
    priority: Priority


class CareerGapRequest(BaseModel):
    """커리어 갭 분석 요청"""
    currentPosition: str
    targetPosition: str
    currentSkills: List[str]
    careerAnalysis: Optional[Dict] = None


class CareerGapResponse(BaseModel):
    """커리어 갭 분석 응답"""
    gapAnalysis: GapAnalysis
    growthPath: List[GrowthStep]
    recommendedResources: List[RecommendedResource]
    nextSteps: List[str]


class SkillDevelopmentRequest(BaseModel):
    """스킬 개발 요청"""
    targetPosition: str
    currentSkills: List[str]


class RequiredSkill(BaseModel):
    """필요 스킬"""
    skill: str
    currentLevel: SkillLevel
    targetLevel: SkillLevel
    priority: Priority
    learningPath: List[str]
    estimatedTime: str


class SkillDevelopmentResponse(BaseModel):
    """스킬 개발 응답"""
    requiredSkills: List[RequiredSkill]
    learningPriority: List[str]


class GrowthTimelineRequest(BaseModel):
    """성장 타임라인 요청"""
    targetPosition: str
    timelineYears: int = Field(default=3, ge=1, le=10)


class TimelinePeriod(BaseModel):
    """타임라인 기간"""
    period: str
    goals: List[str]
    keyActivities: List[str]
    expectedOutcomes: List[str]


class Milestone(BaseModel):
    """마일스톤"""
    month: int
    title: str
    description: str


class GrowthTimelineResponse(BaseModel):
    """성장 타임라인 응답"""
    timeline: List[TimelinePeriod]
    milestones: List[Milestone]


class MarketTrendsRequest(BaseModel):
    """시장 트렌드 요청"""
    targetCareer: str


class MarketTrendsResponse(BaseModel):
    """시장 트렌드 응답"""
    demandLevel: str
    salaryRange: str
    growingSkills: List[str]
    marketInsights: List[str]
    futureOutlook: str
    recommendedCertifications: List[str]


# ============== 4. 이력서 최적화 ==============

class Resume(BaseModel):
    """이력서"""
    summary: Optional[str] = None
    experience: Optional[List[Dict]] = []
    skills: Optional[List[str]] = []
    education: Optional[Dict] = None
    projects: Optional[List[Dict]] = []


class JobPosting(BaseModel):
    """채용 공고"""
    title: str
    company: str
    description: str
    requirements: Optional[str] = None


class KeywordMatch(BaseModel):
    """키워드 매칭"""
    keyword: str
    inResume: bool
    importance: Priority


class OptimizationSuggestion(BaseModel):
    """최적화 제안"""
    section: ResumeSection
    current: str
    suggested: str
    reason: str


class ResumeOptimizationRequest(BaseModel):
    """이력서 최적화 요청"""
    resume: Resume
    jobPosting: JobPosting


class ResumeOptimizationResponse(BaseModel):
    """이력서 최적화 응답"""
    atsScore: int = Field(ge=0, le=100)
    keywordMatches: List[KeywordMatch]
    optimizationSuggestions: List[OptimizationSuggestion]
    missingKeywords: List[str]
    strengthsToHighlight: List[str]
    overallFeedback: str


class ResumeQualityRequest(BaseModel):
    """이력서 품질 분석 요청"""
    resume: Resume


class CategoryScores(BaseModel):
    """카테고리별 점수"""
    formatting: int = Field(ge=0, le=100)
    content: int = Field(ge=0, le=100)
    clarity: int = Field(ge=0, le=100)
    keywords: int = Field(ge=0, le=100)
    achievements: int = Field(ge=0, le=100)


class ImprovementPriority(BaseModel):
    """개선 우선순위"""
    priority: int
    category: str
    suggestion: str
    impact: Priority


class ResumeQualityResponse(BaseModel):
    """이력서 품질 분석 응답"""
    overallScore: int = Field(ge=0, le=100)
    categoryScores: CategoryScores
    strengths: List[str]
    weaknesses: List[str]
    improvementPriorities: List[ImprovementPriority]
    generalAdvice: str


class CoverLetterRequest(BaseModel):
    """자기소개서 생성 요청"""
    resume: Resume
    jobPosting: JobPosting
    userMotivation: Optional[str] = None


class CoverLetterStructure(BaseModel):
    """자기소개서 구조"""
    opening: str
    body1: str
    body2: str
    closing: str


class CoverLetterResponse(BaseModel):
    """자기소개서 생성 응답"""
    coverLetter: str
    structure: CoverLetterStructure
    keyMessages: List[str]
    tips: List[str]


class KeywordSuggestionRequest(BaseModel):
    """키워드 추천 요청"""
    targetPosition: str
    industry: Optional[str] = None


class KeywordSuggestionResponse(BaseModel):
    """키워드 추천 응답"""
    keywords: List[str]


# ============== 5. 채용 공고 분석 ==============

class MarketTrendAnalysisRequest(BaseModel):
    """시장 트렌드 분석 요청"""
    careerField: Optional[str] = None
    days: int = Field(default=30, ge=7, le=90)


class TopItem(BaseModel):
    """상위 항목"""
    name: str
    count: int


class MarketTrendAnalysisResponse(BaseModel):
    """시장 트렌드 분석 응답"""
    success: bool
    period: str
    careerField: str
    totalJobs: int
    topCompanies: List[TopItem]
    topLocations: List[TopItem]
    insights: List[str]
    trendingSkills: List[str]
    growingFields: List[str]
    summary: str


class SkillRequirementsRequest(BaseModel):
    """스킬 요구사항 분석 요청"""
    careerField: str
    days: int = Field(default=30, ge=7, le=90)


class SkillDetail(BaseModel):
    """스킬 상세 정보"""
    skill: str
    frequency: str
    importance: str


class ExperienceLevel(BaseModel):
    """경력 레벨 정보"""
    entry: Optional[str] = None
    mid: Optional[str] = None
    senior: Optional[str] = None


class SkillRequirementsResponse(BaseModel):
    """스킬 요구사항 분석 응답"""
    success: bool
    careerField: str
    analyzedJobs: int
    requiredSkills: List[SkillDetail]
    preferredSkills: List[str]
    emergingSkills: List[str]
    experienceLevel: ExperienceLevel
    recommendations: List[str]


class SalaryTrendsRequest(BaseModel):
    """연봉 트렌드 분석 요청"""
    careerField: Optional[str] = None
    days: int = Field(default=30, ge=7, le=90)


class SalaryRange(BaseModel):
    """연봉 범위"""
    min: Optional[str] = None
    max: Optional[str] = None
    average: Optional[str] = None


class SalaryTrendsResponse(BaseModel):
    """연봉 트렌드 분석 응답"""
    success: bool
    careerField: str
    analyzedJobs: int
    salaryRange: SalaryRange
    benefits: List[str]
    insights: List[str]


class PersonalizedInsightsRequest(BaseModel):
    """맞춤형 인사이트 요청"""
    userProfile: Dict
    careerAnalysis: Dict


class CareerInsight(BaseModel):
    """직업별 인사이트"""
    careerName: str
    jobCount: int
    gapAnalysis: List[str]
    learningPath: List[str]
    competitiveness: str
    recommendations: List[str]


class PersonalizedInsightsResponse(BaseModel):
    """맞춤형 인사이트 응답"""
    success: bool
    insights: List[CareerInsight]
    overallRecommendation: str


class JobComparisonRequest(BaseModel):
    """채용 공고 비교 요청"""
    jobIds: List[int] = Field(min_length=2)


class JobComparisonInfo(BaseModel):
    """비교 공고 정보"""
    id: int
    title: str
    company: str


class ProsCons(BaseModel):
    """장단점"""
    job: str
    pros: List[str]
    cons: List[str]


class ComparisonDetail(BaseModel):
    """비교 상세"""
    similarities: List[str]
    differences: List[str]
    pros_cons: List[ProsCons]


class JobComparisonResponse(BaseModel):
    """채용 공고 비교 응답"""
    success: bool
    jobs: List[JobComparisonInfo]
    comparison: ComparisonDetail
    recommendation: str


# ============== 6. 채용 공고 + 기술/자격증 추천 ==============

class RequiredTechnology(BaseModel):
    """필요 기술"""
    name: str
    category: str
    importance: str  # 필수/우대
    description: Optional[str] = None


class ExamSchedule(BaseModel):
    """시험 일정"""
    year: Optional[str] = None
    round: Optional[str] = None
    docRegStart: Optional[str] = None
    docRegEnd: Optional[str] = None
    docExamStart: Optional[str] = None
    docPassDt: Optional[str] = None
    pracRegStart: Optional[str] = None
    pracExamStart: Optional[str] = None
    pracPassDt: Optional[str] = None


class RequiredCertification(BaseModel):
    """필요 자격증"""
    name: str
    code: Optional[str] = None
    issuer: str
    importance: str  # 필수/추천/우대
    difficulty: str  # 초급/중급/고급
    estimatedPrepTime: Optional[str] = None
    description: Optional[str] = None
    seriesName: Optional[str] = None
    obligFldName: Optional[str] = None
    qualTypeName: Optional[str] = None
    summary: Optional[str] = None
    career: Optional[str] = None
    trend: Optional[str] = None
    nextExam: Optional[ExamSchedule] = None
    isFromQnet: bool = False


class LearningResource(BaseModel):
    """학습 자료"""
    name: str
    type: str  # 강의/도서/문서
    url: Optional[str] = None
    description: Optional[str] = None


class JobWithRequirements(BaseModel):
    """기술/자격증 포함 채용 공고"""
    jobId: str
    title: str
    company: str
    location: Optional[str] = None
    url: str
    description: Optional[str] = None
    siteName: str
    matchScore: int = Field(ge=0, le=100)
    reasons: List[str] = []
    strengths: List[str] = []
    concerns: List[str] = []
    requiredTechnologies: List[RequiredTechnology] = []
    requiredCertifications: List[RequiredCertification] = []
    learningResources: List[LearningResource] = []
    skillGap: List[str] = []


class JobWithRequirementsRequest(BaseModel):
    """기술/자격증 포함 추천 요청"""
    userId: int
    careerAnalysis: Dict
    userProfile: Optional[Dict] = None
    userSkills: Optional[List[str]] = []
    limit: int = Field(default=15, ge=1, le=30)


class JobWithRequirementsResponse(BaseModel):
    """기술/자격증 포함 추천 응답"""
    recommendations: List[JobWithRequirements]
    totalCount: int
    commonRequiredTechnologies: List[RequiredTechnology] = []
    commonRequiredCertifications: List[RequiredCertification] = []
    overallLearningPath: List[str] = []
