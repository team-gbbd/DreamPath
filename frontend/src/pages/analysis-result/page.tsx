import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface EmotionAnalysis {
  description: string;
  score: number;
  emotionalState: string;
}

interface PersonalityAnalysis {
  description: string;
  type: string;
  strengths: string[];
  growthAreas: string[];
}

interface InterestArea {
  name: string;
  level: number;
  description: string;
}

interface InterestAnalysis {
  description: string;
  areas: InterestArea[];
}

interface CareerRecommendation {
  careerName: string;
  description: string;
  matchScore: number;
  reasons: string[];
}

interface AnalysisResult {
  sessionId: string;
  emotion: EmotionAnalysis;
  personality: PersonalityAnalysis;
  interest: InterestAnalysis;
  comprehensiveAnalysis: string;
  recommendedCareers: CareerRecommendation[];
}

export default function AnalysisResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null);
  const [isCreatingPath, setIsCreatingPath] = useState(false);

  useEffect(() => {
    if (sessionId) {
      analyzeSession();
    }
  }, [sessionId]);

  const analyzeSession = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:8080/api/analysis/${sessionId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('분석에 실패했습니다.');
      }

      const data = await response.json();
      console.log('분석 결과:', data);
      setResult(data);
    } catch (err: any) {
      console.error('분석 실패:', err);
      setError(err.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getLoggedInUserId = (): number | null => {
    try {
      const userStr = localStorage.getItem('dreampath:user');
      if (!userStr) return null;
      const user = JSON.parse(userStr);
      return user.userId || null;
    } catch {
      return null;
    }
  };

  const handleSelectCareer = async (careerName: string) => {
    if (!sessionId) {
      alert('세션 정보가 없습니다.');
      return;
    }

    const userId = getLoggedInUserId();
    if (!userId) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    try {
      setIsCreatingPath(true);
      setSelectedCareer(careerName);

      const response = await fetch('http://localhost:8080/api/learning-paths/from-career', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          sessionId,
          selectedCareer: careerName,
        }),
      });

      if (!response.ok) {
        throw new Error('학습 경로 생성에 실패했습니다.');
      }

      const data = await response.json();
      console.log('학습 경로 생성 성공:', data);

      // 생성된 학습 경로 페이지로 이동
      alert(`${careerName} 학습 경로가 생성되었습니다! (${data.learningDomain || data.domain})`);

      // pathId로 학습 경로 상세 페이지로 이동
      const pathId = data.learningPathId || data.pathId;
      if (pathId) {
        navigate(`/learning/${pathId}`);
      } else {
        console.error('학습 경로 ID를 찾을 수 없습니다:', data);
        alert('학습 경로가 생성되었지만 페이지 이동에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('학습 경로 생성 실패:', err);
      alert(err.message || '학습 경로 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreatingPath(false);
      setSelectedCareer(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5A7BFF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 font-medium">분석 중입니다...</p>
          <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-error-warning-line text-6xl text-red-500 mb-4"></i>
          <p className="text-xl text-gray-700 font-medium mb-4">{error}</p>
          <button
            onClick={() => navigate('/career-chat')}
            className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-6 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/career-chat')}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <i className="ri-arrow-left-line text-2xl"></i>
              </button>
              <div className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg flex items-center justify-center">
                <i className="ri-line-chart-line text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">진로 정체성 종합 분석</h1>
                <p className="text-sm text-gray-600">대화를 바탕으로 한 심층 분석 결과</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Three Analysis Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Emotion Analysis */}
          {result.emotion && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center mb-6">
                <i className="ri-emotion-line text-3xl text-pink-500 mr-3"></i>
                <h3 className="text-xl font-bold text-gray-800">감정 분석</h3>
              </div>
              
              {/* Circular Progress */}
              <div className="flex justify-center mb-6">
                <div className="relative w-32 h-32">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="url(#gradient-pink)"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - result.emotion.score / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="gradient-pink" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f472b6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">{result.emotion.score}</span>
                    <span className="text-sm text-gray-500">점</span>
                  </div>
                </div>
              </div>

              <div className="mb-3 text-center">
                <span className="inline-block bg-pink-100 text-pink-700 px-4 py-2 rounded-lg text-sm font-semibold">
                  {result.emotion.emotionalState}
                </span>
              </div>
              <p className="text-gray-600 text-sm text-center leading-relaxed">{result.emotion.description}</p>
            </div>
          )}

          {/* Personality Analysis */}
          {result.personality && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center mb-4">
                <i className="ri-user-star-line text-3xl text-purple-500 mr-3"></i>
                <h3 className="text-xl font-bold text-gray-800">성향 분석</h3>
              </div>
              {result.personality.type && (
                <div className="mb-4 text-center">
                  <span className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-semibold">
                    {result.personality.type}
                  </span>
                </div>
              )}
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">{result.personality.description}</p>
              
              <div className="grid grid-cols-2 gap-3">
                {/* 강점 박스 */}
                {result.personality.strengths && result.personality.strengths.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center mb-2">
                      <i className="ri-arrow-up-circle-line text-blue-600 mr-1"></i>
                      <h4 className="text-xs font-bold text-blue-900">강점</h4>
                    </div>
                    <div className="space-y-1">
                      {result.personality.strengths.map((strength, idx) => (
                        <div key={idx} className="text-xs text-blue-700 bg-white rounded px-2 py-1">
                          {strength}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 발전 영역 박스 */}
                {result.personality.growthAreas && result.personality.growthAreas.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center mb-2">
                      <i className="ri-plant-line text-green-600 mr-1"></i>
                      <h4 className="text-xs font-bold text-green-900">발전 영역</h4>
                    </div>
                    <div className="space-y-1">
                      {result.personality.growthAreas.map((area, idx) => (
                        <div key={idx} className="text-xs text-green-700 bg-white rounded px-2 py-1">
                          {area}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interest Analysis */}
          {result.interest && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center mb-4">
                <i className="ri-heart-3-line text-3xl text-red-500 mr-3"></i>
                <h3 className="text-xl font-bold text-gray-800">흥미 분석</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">{result.interest.description}</p>
              
              {/* Radar Chart */}
              {result.interest.areas && result.interest.areas.length > 0 && (
                <>
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={result.interest.areas.map(area => ({ subject: area.name, value: area.level * 10 }))}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 11 }} />
                        <Radar name="흥미도" dataKey="value" stroke="#f59e0b" fill="#fbbf24" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-3">
                    {result.interest.areas.map((area, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-gray-800">{area.name}</span>
                          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                            Lv. {area.level}/10
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                          <div 
                            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${(area.level / 10) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600">{area.description}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Comprehensive Analysis */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center mb-4">
            <i className="ri-file-text-line text-3xl text-[#5A7BFF] mr-3"></i>
            <h2 className="text-2xl font-bold text-gray-800">종합 분석</h2>
          </div>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.comprehensiveAnalysis}</p>
        </div>

        {/* Recommended Careers */}
        {result.recommendedCareers && result.recommendedCareers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center mb-6">
              <i className="ri-briefcase-line text-3xl text-[#5A7BFF] mr-3"></i>
              <h2 className="text-2xl font-bold text-gray-800">추천 진로</h2>
            </div>
            
            {/* Bar Chart */}
            <div className="mb-8">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={result.recommendedCareers.map(c => ({ name: c.careerName, matchScore: c.matchScore }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    labelStyle={{ color: '#1f2937', fontWeight: 'bold' }}
                  />
                  <Legend />
                  <Bar dataKey="matchScore" name="매칭도 (%)" fill="url(#colorBar)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5A7BFF" />
                      <stop offset="100%" stopColor="#8F5CFF" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {result.recommendedCareers.map((career, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-[#5A7BFF]/10 to-[#8F5CFF]/10 border-2 border-[#5A7BFF]/20 rounded-xl p-6 relative"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-800">{career.careerName}</h3>
                    <div className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-3 py-1 rounded-full text-sm font-bold">
                      {career.matchScore}%
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{career.description}</p>
                  {career.reasons && career.reasons.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">추천 이유:</h4>
                      <ul className="space-y-1">
                        {career.reasons.map((reason, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start">
                            <span className="text-[#5A7BFF] mr-2">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={() => handleSelectCareer(career.careerName)}
                    disabled={isCreatingPath}
                    className={`w-full mt-4 py-2 px-4 rounded-lg font-medium transition-all ${
                      isCreatingPath && selectedCareer === career.careerName
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white hover:opacity-90'
                    }`}
                  >
                    {isCreatingPath && selectedCareer === career.careerName ? (
                      <>
                        <i className="ri-loader-4-line animate-spin mr-2"></i>
                        학습 경로 생성 중...
                      </>
                    ) : (
                      <>
                        <i className="ri-play-circle-line mr-2"></i>
                        이 직업으로 학습 시작하기
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center space-x-4 flex-wrap gap-4">
          <button
            onClick={() => navigate('/career-chat')}
            className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-8 py-3 rounded-xl hover:opacity-90 transition-opacity font-medium"
          >
            <i className="ri-chat-3-line mr-2"></i>
            상담 계속하기
          </button>
          {result.recommendedCareers && result.recommendedCareers.length > 0 && (
            <button
              onClick={() => navigate('/job-listings', { 
                state: { careerRecommendations: result.recommendedCareers } 
              })}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-xl hover:opacity-90 transition-opacity font-medium"
            >
              <i className="ri-briefcase-line mr-2"></i>
              채용 정보 보기
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="bg-white text-gray-700 border-2 border-gray-300 px-8 py-3 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            <i className="ri-printer-line mr-2"></i>
            결과 인쇄하기
          </button>
        </div>
      </div>
    </div>
  );
}

