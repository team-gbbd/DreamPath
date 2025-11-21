// 직업 체험 진행 상황 관리

export interface CareerProgress {
  currentSceneId: number;
  totalScore: number;
  completedTests: number;
  lastTestScore?: number;
}

const STORAGE_KEY = 'dreampath_career_progress';

// 진행 상황 불러오기
export const getCareerProgress = (): CareerProgress => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // 기본값
  return {
    currentSceneId: 1,
    totalScore: 0,
    completedTests: 0,
  };
};

// 진행 상황 저장
export const saveCareerProgress = (progress: CareerProgress): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
};

// 코딩 테스트 완료 처리
export const completeCodingTest = (score: number, nextSceneId: number): CareerProgress => {
  const current = getCareerProgress();
  const updated: CareerProgress = {
    currentSceneId: nextSceneId,
    totalScore: current.totalScore + score,
    completedTests: current.completedTests + 1,
    lastTestScore: score,
  };
  saveCareerProgress(updated);
  return updated;
};

// 다음 씬으로 이동
export const moveToNextScene = (nextSceneId: number): void => {
  const current = getCareerProgress();
  saveCareerProgress({
    ...current,
    currentSceneId: nextSceneId,
    lastTestScore: undefined, // 다음 씬으로 넘어가면 마지막 점수 초기화
  });
};

// 진행 상황 초기화 (처음부터 다시)
export const resetCareerProgress = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
