// 백엔드 개발자 직업 체험 시나리오
export interface SceneOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
  score: number;
}

export interface Scene {
  id: number;
  image: string;
  dialogue: string;
  question?: string;
  options?: SceneOption[];
  nextScene?: number;
  // 코딩 테스트 관련
  codingTest?: {
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    requiredScore: number; // 통과 점수
  };
}

export const developerScenario: Scene[] = [
  // 시작: 첫 번째 코딩 테스트
  {
    id: 1,
    image: '/images/career-simulation/developer-scene-1.png',
    dialogue: '첫 출근 첫날, 팀장님이 다가옵니다.\n\n"환영합니다! 오늘은 간단한 워밍업 문제부터 시작해볼까요?"',
    codingTest: {
      difficulty: 'EASY',
      requiredScore: 10,
    },
    nextScene: 2,
  },

  // 첫 번째 성공 후
  {
    id: 2,
    image: '/images/career-simulation/developer-scene-1.png',
    dialogue: '잘했어요! 기초는 완벽하네요.\n\n이번엔 조금 더 실전에 가까운 문제를 풀어볼까요?',
    codingTest: {
      difficulty: 'EASY',
      requiredScore: 10,
    },
    nextScene: 3,
  },

  // 두 번째 성공 후
  {
    id: 3,
    image: '/images/career-simulation/developer-scene-1.png',
    dialogue: '오, 빠르네요! 이제 중급 문제에 도전해봅시다.',
    codingTest: {
      difficulty: 'MEDIUM',
      requiredScore: 10,
    },
    nextScene: 4,
  },

  // 세 번째 성공 후
  {
    id: 4,
    image: '/images/career-simulation/developer-scene-1.png',
    dialogue: '훌륭합니다! 마지막으로 어려운 문제 하나만 더 풀어볼까요?',
    codingTest: {
      difficulty: 'HARD',
      requiredScore: 10,
    },
    nextScene: 5,
  },

  // 최종 완료
  {
    id: 5,
    image: '/images/career-simulation/developer-scene-1.png',
    dialogue: '와! 모든 문제를 완료했네요!\n\n축하합니다! 개발자로서의 첫 걸음을 성공적으로 마쳤습니다.',
    nextScene: -1, // -1 = 결과 화면
  },

  // 아래는 기존 시나리오 (나중에 사용)
  {
    id: 100,
    image: '/images/career-simulation/developer-scene-1.png',
    dialogue: '고객들이 로그인이 안 된다고 불평합니다. 코드를 확인해주세요.',
    question: '다음 코드에서 버그를 찾아주세요:\n\nfunction login(user, password) {\n  if (user.password = password) {\n    return true;\n  }\n  return false;\n}',
    options: [
      {
        id: 'a',
        text: 'user.password = password (=를 ===로 변경)',
        isCorrect: true,
        feedback: '정답입니다! "=" 는 할당 연산자입니다. 비교를 하려면 "===" 를 써야 합니다.\n\n이 버그 때문에 모든 비밀번호가 통과되고 있었어요!',
        score: 20,
      },
      {
        id: 'b',
        text: 'return true를 return "success"로 변경',
        isCorrect: false,
        feedback: 'return 값은 문제가 없습니다. 다른 곳을 확인해보세요.',
        score: 5,
      },
      {
        id: 'c',
        text: '문제가 없어 보입니다',
        isCorrect: false,
        feedback: '아쉽지만 버그가 있습니다. 조건문을 다시 확인해보세요.',
        score: 0,
      },
    ],
    nextScene: 3,
  },
  {
    id: 3,
    image: '/images/career-simulation/developer-scene-1.png',
    dialogue: '잘하셨습니다! 이번엔 성능 문제를 봐주세요.',
    question: '사용자 목록 조회가 너무 느립니다. 무엇이 문제일까요?\n\nfunction getUsers() {\n  const users = [];\n  for (let i = 1; i <= 10000; i++) {\n    users.push(db.query(`SELECT * FROM users WHERE id=${i}`));\n  }\n  return users;\n}',
    options: [
      {
        id: 'a',
        text: 'N+1 쿼리 문제 (한 번에 조회해야 함)',
        isCorrect: true,
        feedback: '정확합니다! 10,000번 쿼리를 날리고 있어요.\n\n한 번의 쿼리로 모든 데이터를 가져오면\n10초 → 0.1초로 줄어듭니다!',
        score: 25,
      },
      {
        id: 'b',
        text: 'for 루프를 while로 변경',
        isCorrect: false,
        feedback: '루프 종류는 성능에 큰 영향이 없습니다. 데이터베이스 호출을 개선해야 해요.',
        score: 5,
      },
      {
        id: 'c',
        text: '배열 대신 객체 사용',
        isCorrect: false,
        feedback: '자료구조는 문제가 아닙니다. 쿼리 방식을 개선해야 해요.',
        score: 5,
      },
    ],
    nextScene: 4,
  },
  {
    id: 4,
    image: '/images/career-simulation/developer-scene-1.png',
    dialogue: '축하합니다! 백엔드 개발자 체험을 완료하셨습니다.\n\n당신의 결과를 확인해보세요!',
    nextScene: -1, // 결과 화면으로
  },
];
