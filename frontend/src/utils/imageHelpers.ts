import { jobCategoryMap } from '@/utils/jobCategoryMap';
import { majorCategoryMap } from '@/utils/majorCategoryMap';
import { jobImageCount } from '@/utils/jobImageCount';
import { majorImageCount } from '@/utils/majorImageCount';

// 🔥 반드시 실제 Supabase URL로 변경하세요
const SUPABASE_BASE =
  'https://ssindowhjsowftiglvsz.supabase.co/storage/v1/object/public/career-images';

type LookupRecord = Record<string, string>;

const NON_WORD_CHARS = /[\s·•,./\\|()\-]/g;
const JOB_SUFFIXES = ['관련서비스직', '관련 서비스직', '관련직'];
const MAJOR_SUFFIXES = ['계열'];

const normalizedJobMap: LookupRecord = buildNormalizedLookup(jobCategoryMap, JOB_SUFFIXES);
const normalizedMajorMap: LookupRecord = buildNormalizedLookup(majorCategoryMap, MAJOR_SUFFIXES);

function buildNormalizedLookup(source: Record<string, string>, removableSuffixes: string[] = []): LookupRecord {
  return Object.entries(source).reduce((acc, [label, slug]) => {
    const normalized = sanitizeLabel(label);
    acc[normalized] = slug;

    const trimmed = removeSuffixes(normalized, removableSuffixes);
    if (trimmed && trimmed !== normalized && !acc[trimmed]) {
      acc[trimmed] = slug;
    }

    return acc;
  }, {} as LookupRecord);
}

function sanitizeLabel(value: string): string {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(NON_WORD_CHARS, '')
    .replace(/[“”"']/g, '');
}

function removeSuffixes(value: string, suffixes: string[]): string {
  if (!value) return '';
  let result = value;
  suffixes.forEach((suffix) => {
    const normalizedSuffix = sanitizeLabel(suffix);
    if (normalizedSuffix && result.endsWith(normalizedSuffix)) {
      result = result.slice(0, result.length - normalizedSuffix.length);
    }
  });
  return result;
}

// 이름 기반 추론을 위한 키워드 맵 (카테고리 정보가 없을 때 사용)
const JOB_KEYWORD_MAP: Record<string, string> = {
  '소방': 'social_service',
  '경찰': 'social_service',
  '경호': 'social_service',
  '군인': 'social_service',
  '장교': 'social_service',
  '부사관': 'social_service',
  '경비': 'social_service',
  '안전': 'social_service',
  '개발': 'it_pro',
  '소프트웨어': 'it_pro',
  'IT': 'it_pro',
  '데이터': 'it_pro',
  '디자인': 'design',
  '디자이너': 'design',
  '예술': 'special_arts',
  '아트': 'special_arts',
  '음악': 'music',
  '악기': 'musical_instrument',
  '가수': 'music',
  '연기': 'special_arts',
  '배우': 'special_arts',
  '모델': 'special_arts',
  '감독': 'media_video',
  'PD': 'media_video',
  '영상': 'media_video',
  '방송': 'media_video',
  '기자': 'media_video',
  '아나운서': 'media_video',
  '운동': 'sports',
  '스포츠': 'sports',
  '선수': 'sports',
  '체육': 'sports',
  '마케팅': 'planning_service',
  '기획': 'planning_service',
  '홍보': 'planning_service',
  '광고': 'planning_service',
  '경영': 'management',
  '사무': 'office_admin',
  '행정': 'office_admin',
  '회계': 'accounting',
  '세무': 'accounting',
  '금융': 'finance_business',
  '은행': 'finance_business',
  '증권': 'finance_business',
  '투자': 'finance_business',
  '요리': 'skilled_trades',
  '조리': 'skilled_trades',
  '셰프': 'skilled_trades',
  '제과': 'skilled_trades',
  '제빵': 'skilled_trades',
  '미용': 'beauty_care',
  '뷰티': 'beauty_care',
  '메이크업': 'beauty_care',
  '헤어': 'beauty_care',
  '건축': 'engineering_tech',
  '토목': 'engineering_tech',
  '건설': 'engineering_tech',
  '기계': 'engineering_tech',
  '전기': 'engineering_tech',
  '전자': 'engineering_tech',
  '로봇': 'engineering_tech',
  '드론': 'engineering_tech',
  '화학': 'science_pro',
  '생물': 'science_pro',
  '과학': 'science_pro',
  '연구': 'science_pro',
  '의사': 'medical_pro',
  '간호': 'medical_pro',
  '약사': 'medical_pro',
  '치료': 'medical_pro',
  '의료': 'medical_pro',
  '교사': 'education_service',
  '선생님': 'education_service',
  '강사': 'education_service',
  '교수': 'education_service',
  '교육': 'education_service',
  '상담': 'social_service',
  '복지': 'social_service',
  '사회': 'social_service',
  '농업': 'agro_bio',
  '농장': 'agro_bio',
  '동물': 'agro_bio',
  '수의': 'agro_bio',
  '환경': 'nature_friendly',
  '에너지': 'nature_friendly',
  '항공': 'general_driving',
  '운전': 'general_driving',
  '배송': 'general_driving',
  '택배': 'general_driving',
};

const MAJOR_KEYWORD_MAP: Record<string, string> = {
  '공학': 'engineering',
  '소프트웨어': 'engineering',
  '컴퓨터': 'engineering',
  '기계': 'engineering',
  '전기': 'engineering',
  '전자': 'engineering',
  '건축': 'engineering',
  '토목': 'engineering',
  '화학공': 'engineering',
  '교육': 'education',
  '사범': 'education',
  '교대': 'education',
  '유아': 'education',
  '초등': 'education',
  '경영': 'social',
  '경제': 'social',
  '사회': 'social',
  '행정': 'social',
  '심리': 'social',
  '복지': 'social',
  '법학': 'social',
  '경찰': 'social',
  '신문': 'social',
  '방송': 'social',
  '광고': 'social',
  '디자인': 'arts_physical',
  '미술': 'arts_physical',
  '예술': 'arts_physical',
  '음악': 'arts_physical',
  '체육': 'arts_physical',
  '스포츠': 'arts_physical',
  '운동': 'arts_physical',
  '무용': 'arts_physical',
  '연기': 'arts_physical',
  '영화': 'arts_physical',
  '경호': 'arts_physical',
  '의예': 'medical',
  '의학': 'medical',
  '간호': 'medical',
  '약학': 'medical',
  '물리치료': 'medical', // Fixed duplicate '물리' key
  '치료': 'medical',
  '보건': 'medical',
  '국어': 'humanities',
  '영어': 'humanities',
  '독어': 'humanities',
  '불어': 'humanities',
  '중어': 'humanities',
  '일어': 'humanities',
  '언어': 'humanities',
  '철학': 'humanities',
  '사학': 'humanities',
  '역사': 'humanities',
  '수학': 'natural',
  '물리': 'natural', // This is now unique
  '화학': 'natural',
  '생물': 'natural',
  '지구': 'natural',
  '통계': 'natural',
};

function inferCategoryFromTitle(title: string, map: Record<string, string>): string | null {
  if (!title) return null;
  for (const [keyword, slug] of Object.entries(map)) {
    if (title.includes(keyword)) {
      return slug;
    }
  }
  return null;
}

const DEFAULT_JOB_SLUG = 'general_service';
const DEFAULT_MAJOR_SLUG = 'general';

function resolveJobSlug(category: string, title: string = ''): string { // Added title parameter
  // 1. Try to infer from title first if category is suspiciously empty or generic
  if ((!category || category === '정보 없음' || category === '미확인') && title) {
    const inferred = inferCategoryFromTitle(title, JOB_KEYWORD_MAP);
    if (inferred && jobImageCount[inferred as keyof typeof jobImageCount]) {
      console.log(`[JobImage] Inferred from title "${title}": ${inferred}`);
      return inferred;
    }
  }

  // 2. If valid input category
  if (category && jobImageCount[category as keyof typeof jobImageCount]) {
    return category;
  }

  // 3. Map from Korean Category
  const direct = jobCategoryMap[category];
  if (direct && jobImageCount[direct as keyof typeof jobImageCount]) {
    return direct;
  }

  // 4. Normalize and lookup
  const normalized = sanitizeLabel(category);
  const trimmed = removeSuffixes(normalized, JOB_SUFFIXES);

  let slug = normalizedJobMap[normalized] || normalizedJobMap[trimmed];

  if (slug && jobImageCount[slug as keyof typeof jobImageCount]) {
    return slug;
  }

  // 5. Final attempt: Infer from title if everything else failed
  if (title) {
    const inferred = inferCategoryFromTitle(title, JOB_KEYWORD_MAP);
    if (inferred && jobImageCount[inferred as keyof typeof jobImageCount]) {
      console.log(`[JobImage] Backup inferred from "${title}": ${inferred}`);
      return inferred;
    }
  }

  return DEFAULT_JOB_SLUG;
}

function resolveMajorSlug(category: string, title: string = ''): string { // Added title parameter
  // 1. Try to infer from title first
  if ((!category || category === '정보 없음' || category === '미확인') && title) {
    const inferred = inferCategoryFromTitle(title, MAJOR_KEYWORD_MAP);
    if (inferred && majorImageCount[inferred as keyof typeof majorImageCount]) {
      console.log(`[MajorImage] Inferred from title "${title}": ${inferred}`);
      return inferred;
    }
  }

  if (category && majorImageCount[category as keyof typeof majorImageCount]) {
    return category;
  }

  const direct = majorCategoryMap[category];
  if (direct && majorImageCount[direct as keyof typeof majorImageCount]) {
    return direct;
  }

  const normalized = sanitizeLabel(category);
  const trimmed = removeSuffixes(normalized, MAJOR_SUFFIXES);

  let slug = normalizedMajorMap[normalized] || normalizedMajorMap[trimmed];

  if (slug && majorImageCount[slug as keyof typeof majorImageCount]) {
    return slug;
  }

  // Backup inference
  if (title) {
    const inferred = inferCategoryFromTitle(title, MAJOR_KEYWORD_MAP);
    if (inferred && majorImageCount[inferred as keyof typeof majorImageCount]) {
      console.log(`[MajorImage] Backup inferred from "${title}": ${inferred}`);
      return inferred;
    }
  }

  return DEFAULT_MAJOR_SLUG;
}

// 문자열을 안정적인 해시로 변환
function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // 32bit integer
  }
  return Math.abs(hash);
}

// 고정 랜덤 index 생성 (항상 같은 input → 같은 output)
function getStableIndex(key: string, max: number) {
  if (max <= 1) return 1;
  const hashed = hashString(key);
  return (hashed % max) + 1; // index 범위: 1 ~ max
}

// 직업 이미지 URL 생성 함수
export function getJobImage(category: string, name: string) {
  const slug = resolveJobSlug(category, name);
  // Console log for debugging

  if (!slug) return '';
  const max = jobImageCount[slug as keyof typeof jobImageCount] || 1;
  const stableIndex = getStableIndex(`${slug}-${name}`, max);
  return `${SUPABASE_BASE}/jobs/${slug}_${stableIndex}.svg`;
}

// 학과 이미지 URL 생성 함수
export function getMajorImage(category: string, name: string) {
  const slug = resolveMajorSlug(category, name);
  // Console log for debugging

  if (!slug) return '';
  const max = majorImageCount[slug as keyof typeof majorImageCount] || 1;
  const stableIndex = getStableIndex(`${slug}-${name}`, max);
  return `${SUPABASE_BASE}/majors/${slug}_${stableIndex}.svg`;
}
