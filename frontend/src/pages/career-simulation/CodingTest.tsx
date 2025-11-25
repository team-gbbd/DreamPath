import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { submitCode, runJavaScriptLocally, LANGUAGE_IDS } from '@/lib/judge0';
import { completeCodingTest, getCareerProgress } from '@/utils/careerProgress';

const DEFAULT_CODE = {
  javascript: `function solution() {
  // 여기에 코드를 작성하세요
  let answer = 0;

  return answer;
}

console.log(solution());`,
  python: `def solution():
    # 여기에 코드를 작성하세요
    answer = 0

    return answer

print(solution())`,
  java: `public class Main {
    public static int solution() {
        // 여기에 코드를 작성하세요
        int answer = 0;

        return answer;
    }

    public static void main(String[] args) {
        System.out.println(solution());
    }
}`,
};

interface CodingProblem {
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  hints?: string[];
  starterCode?: {
    javascript?: string;
    python?: string;
    java?: string;
  };
  solutionCode?: {
    javascript?: string;
    python?: string;
    java?: string;
  };
  timeLimit?: string;
  memoryLimit?: string;
}

export default function CodingTest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const difficultyFromUrl = (searchParams.get('difficulty') as 'EASY' | 'MEDIUM' | 'HARD') || 'EASY';

  const [selectedLanguage, setSelectedLanguage] = useState<'javascript' | 'python' | 'java'>('javascript');
  const [code, setCode] = useState(DEFAULT_CODE.javascript);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [problem, setProblem] = useState<CodingProblem | null>(null);
  const [isLoadingProblem, setIsLoadingProblem] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>(difficultyFromUrl);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');

  // 컴포넌트 마운트 시 문제 생성
  useEffect(() => {
    generateProblem(difficultyFromUrl);
  }, []);

  const generateProblem = async (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => {
    setIsLoadingProblem(true);
    try {
      const response = await fetch('http://localhost:8000/api/learning/generate-coding-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty }),
      });

      if (!response.ok) {
        throw new Error('문제 생성 실패');
      }

      const data = await response.json();
      setProblem(data.problem);

      // 빈칸 채우기 코드로 에디터 초기화
      if (data.problem.starterCode && data.problem.starterCode[selectedLanguage]) {
        setCode(data.problem.starterCode[selectedLanguage]);
      }
    } catch (error) {
      console.error('문제 생성 에러:', error);
      // 폴백: 하드코딩된 문제
      setProblem({
        title: '두 수의 합',
        description: '두 정수 a와 b가 주어졌을 때, a + b를 return 하는 solution 함수를 작성하세요.',
        difficulty,
        constraints: ['1 ≤ a, b ≤ 1000'],
        examples: [
          { input: 'a = 2, b = 3', output: '5' },
          { input: 'a = 100, b = 200', output: '300' },
        ],
      });
    } finally {
      setIsLoadingProblem(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !problem) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages([...chatMessages, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch('http://localhost:8000/api/learning/coding-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage,
          problemTitle: problem.title,
          problemDescription: problem.description,
          currentCode: code,
          language: selectedLanguage,
        }),
      });

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      console.error('챗봇 에러:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송합니다. 지금은 답변할 수 없습니다. 힌트를 참고해보세요!'
      }]);
    }
  };

  const handleRunCode = async () => {
    console.log('실행 버튼 클릭됨');
    setIsRunning(true);
    setOutput('코드 실행 중...\n');

    try {
      // Judge0로 실제 코드 실행
      const languageId = LANGUAGE_IDS[selectedLanguage];
      console.log('Language ID:', languageId, 'Code:', code.substring(0, 50));

      const result = await submitCode(code, languageId, '');
      console.log('실행 결과:', result);

      if (result.status.id === 3) {
        // 성공 (Accepted)
        setOutput(`✅ 실행 성공!\n\n출력:\n${result.stdout || '(출력 없음)'}\n\n실행 시간: ${result.time}s\n메모리: ${result.memory || 0} KB`);
      } else if (result.status.id === 6) {
        // 컴파일 에러
        setOutput(`❌ 컴파일 에러\n\n${result.compile_output}`);
      } else if (result.status.id === 11 || result.status.id === 12) {
        // 런타임 에러
        setOutput(`❌ 런타임 에러\n\n${result.stderr}`);
      } else {
        // 기타 에러
        setOutput(`❌ ${result.status.description}\n\n${result.stderr || result.compile_output || ''}`);
      }
    } catch (error) {
      console.error('실행 에러:', error);
      setOutput(`❌ 실행 실패\n\n${error.message}\n\n로컬 실행으로 전환 중...`);

      // Judge0 실패 시 로컬 JavaScript 실행 (폴백)
      if (selectedLanguage === 'javascript') {
        try {
          const result = runJavaScriptLocally(code);
          if (result.status.id === 3) {
            setOutput(`✅ 실행 성공! (로컬)\n\n출력:\n${result.stdout || '(출력 없음)'}`);
          } else {
            setOutput(`❌ 에러\n\n${result.stderr}`);
          }
        } catch (localError: any) {
          setOutput(`❌ 로컬 실행 실패\n\n${localError.message}`);
        }
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    // 코드가 정답인지 확인 (실행 결과로 판단)
    if (!output.includes('✅ 실행 성공')) {
      alert('먼저 코드를 실행해서 정답인지 확인하세요!');
      return;
    }

    // 점수 저장 및 다음 씬으로 이동
    const progress = getCareerProgress();
    const nextSceneId = progress.currentSceneId + 1;

    // 기본 점수 10점 (난이도에 따라 조정 가능)
    const score = selectedDifficulty === 'EASY' ? 10 : selectedDifficulty === 'MEDIUM' ? 15 : 20;

    completeCodingTest(score, nextSceneId);

    // 다음 씬으로 이동
    navigate('/career-simulation/developer');
  };

  const handleDifficultyChange = (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => {
    setSelectedDifficulty(difficulty);
    generateProblem(difficulty);
  };

  if (isLoadingProblem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">문제 생성 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-6 h-screen flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">
            코딩 테스트 {problem && `- ${problem.difficulty}`}
          </h1>
          <div className="flex items-center gap-4">
            <select
              value={selectedDifficulty}
              onChange={(e) => handleDifficultyChange(e.target.value as 'EASY' | 'MEDIUM' | 'HARD')}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]"
            >
              <option value="EASY">쉬움</option>
              <option value="MEDIUM">보통</option>
              <option value="HARD">어려움</option>
            </select>
            <select
              value={selectedLanguage}
              onChange={(e) => {
                const lang = e.target.value as 'javascript' | 'python' | 'java';
                setSelectedLanguage(lang);
                // 빈칸 코드가 있으면 빈칸 코드로, 없으면 기본 코드로
                if (problem?.starterCode && problem.starterCode[lang]) {
                  setCode(problem.starterCode[lang]);
                } else {
                  setCode(DEFAULT_CODE[lang]);
                }
              }}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python 3</option>
              <option value="java">Java</option>
            </select>
            <button
              onClick={() => navigate('/career-simulation/developer')}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← 돌아가기
            </button>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          {/* 왼쪽: 문제 설명 */}
          <div className="bg-gray-800 rounded-xl p-6 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-[#5A7BFF]">
              📘 {problem?.title || '문제'}
            </h2>

            {/* 문제 설명 */}
            <div className="text-gray-300 leading-relaxed whitespace-pre-line mb-6">
              {problem?.description || '문제를 불러오는 중...'}
            </div>

            {/* 함수 설명 */}
            {problem?.functionDescription && (
              <div className="mb-6 p-4 bg-gray-700/50 rounded-lg border-l-4 border-[#5A7BFF]">
                <h3 className="font-bold mb-2 text-[#5A7BFF]">🔍 함수 설명</h3>
                <div className="text-sm text-gray-300 font-mono">
                  {problem.functionDescription}
                </div>
              </div>
            )}

            {/* 제한사항 */}
            {problem?.constraints && problem.constraints.length > 0 && (
              <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
                <h3 className="font-bold mb-2">📌 제한사항</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  {problem.constraints.map((constraint, idx) => (
                    <li key={idx}>• {constraint}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 입출력 예 (표 형식) */}
            {problem?.examples && problem.examples.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold mb-3">📝 입출력 예</h3>
                <div className="bg-gray-700/50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-300 font-semibold">입력</th>
                        <th className="px-4 py-2 text-left text-gray-300 font-semibold">출력</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problem.examples.map((example: any, idx: number) => (
                        <tr key={idx} className="border-t border-gray-600">
                          <td className="px-4 py-2 text-gray-300 font-mono">{example.call || example.input}</td>
                          <td className="px-4 py-2 text-green-400 font-mono font-bold">{example.returns || example.output}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 설명 */}
                {problem.examples.some((ex: any) => ex.explanation) && (
                  <div className="mt-3 p-3 bg-gray-700/30 rounded-lg">
                    <h4 className="font-bold mb-2 text-sm text-gray-400">💡 설명</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                      {problem.examples.map((example: any, idx: number) => (
                        example.explanation && (
                          <li key={idx}>• {example.explanation}</li>
                        )
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 힌트 섹션 */}
            {problem?.hints && problem.hints.length > 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg border border-yellow-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-bold text-yellow-300">
                    <span>💡</span>
                    <span>힌트 {currentHintIndex + 1}/{problem.hints.length}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentHintIndex(Math.max(0, currentHintIndex - 1))}
                      disabled={currentHintIndex === 0}
                      className="px-3 py-1 bg-yellow-700 hover:bg-yellow-600 rounded text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      이전
                    </button>
                    <button
                      onClick={() => setCurrentHintIndex(Math.min(problem.hints.length - 1, currentHintIndex + 1))}
                      disabled={currentHintIndex === problem.hints.length - 1}
                      className="px-3 py-1 bg-yellow-700 hover:bg-yellow-600 rounded text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      다음
                    </button>
                  </div>
                </div>
                <div className="text-sm text-yellow-100 bg-yellow-900/20 p-3 rounded border-l-4 border-yellow-500">
                  {problem.hints[currentHintIndex]}
                </div>
              </div>
            )}

          </div>

          {/* 오른쪽: 코드 에디터 + 결과 */}
          <div className="flex flex-col gap-4 min-h-0">
            {/* 코드 에디터 */}
            <div className="flex-[2] bg-gray-800 rounded-xl overflow-hidden flex flex-col min-h-0 relative">
              <div className="bg-gray-900 px-4 py-2 flex items-center justify-between flex-shrink-0">
                <span className="text-sm text-gray-400">
                  solution.{selectedLanguage === 'javascript' ? 'js' : selectedLanguage === 'python' ? 'py' : 'java'}
                </span>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={handleRunCode}
                    disabled={isRunning}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 rounded-full text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isRunning ? '실행 중...' : '실행'}
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-1.5 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] hover:shadow-lg rounded-full text-sm font-semibold transition-all"
                  >
                    제출
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  language={selectedLanguage}
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
              {/* AI 버튼 - 코드 에디터 우측 하단 */}
              <button
                onClick={() => setShowChatbot(true)}
                className="absolute bottom-4 right-4 px-4 py-2 bg-gradient-to-r from-[#A78BFA] to-[#60A5FA] hover:from-[#8B5CF6] hover:to-[#3B82F6] text-white rounded-full shadow-lg hover:shadow-xl transition-all font-semibold text-sm z-10 flex items-center gap-1.5"
                title="AI에게 질문하기"
              >
                <span>AI</span>
                <span>✨</span>
              </button>
            </div>

            {/* 실행 결과 */}
            <div className="flex-1 bg-gray-800 rounded-xl p-4 overflow-y-auto min-h-[150px] max-h-[200px]">
              <h3 className="text-sm font-bold mb-2 text-gray-400">실행 결과</h3>
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                {output || '코드를 실행하면 결과가 여기에 표시됩니다.'}
              </pre>
            </div>
          </div>
        </div>

        {/* GPT 챗봇 창 */}
        <div className="fixed bottom-6 right-6 z-50">
          {showChatbot && (
            <div className="bg-white rounded-2xl shadow-2xl w-96 h-[500px] flex flex-col border border-purple-200">
              {/* 챗봇 헤더 */}
              <div className="bg-gradient-to-r from-[#A78BFA] to-[#60A5FA] px-4 py-3 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-lg">AI ✨</span>
                </div>
                <button
                  onClick={() => setShowChatbot(false)}
                  className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* 챗봇 메시지 영역 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {chatMessages.length === 0 && (
                  <div className="text-gray-500 text-sm text-center mt-8">
                    <p className="mb-2">👋 안녕하세요!</p>
                    <p>막히는 부분이 있으면 언제든 질문해주세요.</p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-[#A78BFA] to-[#60A5FA] text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 챗봇 입력창 */}
              <div className="p-4 border-t border-purple-100 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                    placeholder="질문을 입력하세요..."
                    className="flex-1 bg-purple-50 text-gray-800 placeholder-gray-400 rounded-lg px-4 py-2 border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                  />
                  <button
                    onClick={handleSendChat}
                    className="bg-gradient-to-r from-[#A78BFA] to-[#60A5FA] hover:from-[#8B5CF6] hover:to-[#3B82F6] text-white rounded-lg px-5 py-2 font-semibold transition-all shadow-sm hover:shadow-md"
                  >
                    전송
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
