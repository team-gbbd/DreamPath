import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { developerScenario, Scene, SceneOption } from '@/data/developer-scenario';
import { getCareerProgress, moveToNextScene } from '@/utils/careerProgress';

export default function DeveloperExperience() {
  const navigate = useNavigate();
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedOption, setSelectedOption] = useState<SceneOption | null>(null);

  // 진행 상황 불러오기
  const progress = getCareerProgress();
  const [currentSceneId, setCurrentSceneId] = useState(progress.currentSceneId);
  const [totalScore, setTotalScore] = useState(progress.totalScore);

  // 컴포넌트 마운트 시 진행 상황 동기화
  useEffect(() => {
    const progress = getCareerProgress();
    setCurrentSceneId(progress.currentSceneId);
    setTotalScore(progress.totalScore);
  }, []);

  const currentScene = developerScenario.find((s) => s.id === currentSceneId);

  if (!currentScene) {
    return <div>Scene not found</div>;
  }

  const handleOptionClick = (option: SceneOption) => {
    setSelectedOption(option);
    setShowFeedback(true);
    setTotalScore(totalScore + option.score);
  };

  const handleNext = () => {
    setShowFeedback(false);
    setSelectedOption(null);

    // 코딩 테스트가 있는 씬이면 코딩 테스트로 이동
    if (currentScene.codingTest) {
      navigate(`/career-simulation/coding-test?difficulty=${currentScene.codingTest.difficulty}`);
      return;
    }

    if (currentScene.nextScene === -1) {
      // 결과 화면으로
      navigate(`/career-simulation/result?score=${totalScore}`);
    } else if (currentScene.nextScene === -2) {
      // 코딩테스트로 (하위 호환성)
      navigate('/career-simulation/coding-test');
    } else if (currentScene.nextScene) {
      // 다음 씬으로 이동
      moveToNextScene(currentScene.nextScene);
      setCurrentSceneId(currentScene.nextScene);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="relative w-full max-w-7xl h-screen max-h-[90vh]">
        {/* 배경 이미지 (네가 만든 이미지) */}
        <img
          src={currentScene.image}
          alt="Scene"
          className="w-full h-full object-cover rounded-lg"
        />

        {/* 점수 표시 (우측 상단) */}
        <div className="absolute top-4 right-4 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-6 py-3 rounded-full shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <div>
              <div className="text-xs opacity-80">Total Score</div>
              <div className="text-xl font-bold">{totalScore}점</div>
            </div>
          </div>
        </div>

        {/* 대화창 오버레이 */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          {!showFeedback ? (
            // 일반 대화 또는 문제
            <div className="bg-[#F5E6D3] rounded-2xl border-4 border-[#8B6F47] p-6 shadow-2xl">
              {/* 대사 */}
              <div className="mb-4">
                <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-line">
                  {currentScene.dialogue}
                </p>
              </div>

              {/* 문제 (있을 경우) */}
              {currentScene.question && (
                <div className="mb-4 p-4 bg-gray-800 rounded-lg">
                  <pre className="text-green-400 text-sm font-mono overflow-x-auto">
                    {currentScene.question}
                  </pre>
                </div>
              )}

              {/* 선택지 */}
              {currentScene.options ? (
                <div className="space-y-3">
                  {currentScene.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleOptionClick(option)}
                      className="w-full p-4 bg-gradient-to-r from-[#A8D8F0] to-[#7BC4E8] text-gray-800 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 text-left font-medium"
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              ) : (
                // 선택지 없으면 다음 버튼 또는 코딩 테스트 버튼
                <button
                  onClick={handleNext}
                  className="w-full p-4 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-semibold"
                >
                  {currentScene.codingTest ? '🚀 코딩 테스트 시작' : '다음 →'}
                </button>
              )}
            </div>
          ) : (
            // 피드백 화면
            <div className="bg-[#F5E6D3] rounded-2xl border-4 border-[#8B6F47] p-6 shadow-2xl">
              <div className="mb-4">
                {selectedOption?.isCorrect ? (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-3xl">✅</span>
                    <span className="text-xl font-bold text-green-600">정답입니다!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-3xl">❌</span>
                    <span className="text-xl font-bold text-red-600">아쉽습니다</span>
                  </div>
                )}

                <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                  {selectedOption?.feedback}
                </p>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">획득 점수:</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">
                      +{selectedOption?.score}점
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-700">현재 총점:</span>
                    <span className="text-xl font-bold text-gray-900">
                      {totalScore}점
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full p-4 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-semibold"
              >
                다음 →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
