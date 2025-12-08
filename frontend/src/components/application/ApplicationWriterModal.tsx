import { useState, useEffect } from "react";
import { applicationService } from "@/lib/api";

interface JobInfo {
  jobId: string;
  title: string;
  company: string;
  description?: string | null;
  location?: string | null;
  url?: string;
}

interface CoverLetterData {
  opening: string;
  body: string;
  closing: string;
}

interface Tip {
  category: string;
  tip: string;
  example?: string;
}

interface ImprovementSuggestion {
  area: string;
  suggestion: string;
}

interface GeneratedResult {
  coverLetter: CoverLetterData;
  highlights: string[];
  tips: Tip[];
  warnings: string[];
  improvementSuggestions: ImprovementSuggestion[];
}

interface ReviewResult {
  overallScore: number;
  overallFeedback: string;
  scores: {
    relevance: { score: number; feedback: string };
    specificity: { score: number; feedback: string };
    differentiation: { score: number; feedback: string };
    authenticity: { score: number; feedback: string };
    structure: { score: number; feedback: string };
  };
  strengths: string[];
  improvements: {
    issue: string;
    suggestion: string;
    example?: string;
  }[];
  rewriteSuggestions: {
    original: string;
    improved: string;
    reason: string;
  }[];
}

interface ApplicationWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobInfo: JobInfo;
  userId: number;
}

export default function ApplicationWriterModal({
  isOpen,
  onClose,
  jobInfo,
  userId,
}: ApplicationWriterModalProps) {
  const [activeTab, setActiveTab] = useState<"generate" | "review" | "tips">("generate");
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState<"professional" | "passionate" | "creative">("professional");

  // Generated cover letter
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);

  // Review mode
  const [userCoverLetter, setUserCoverLetter] = useState("");
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);

  // Tips
  const [tipsResult, setTipsResult] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setGeneratedResult(null);
      setReviewResult(null);
      setTipsResult(null);
      setUserCoverLetter("");
    }
  }, [isOpen]);

  const handleGenerateCoverLetter = async () => {
    setLoading(true);
    try {
      const result = await applicationService.generateCoverLetter(
        userId,
        {
          jobId: jobInfo.jobId,
          title: jobInfo.title,
          company: jobInfo.company,
          description: jobInfo.description || undefined,
          location: jobInfo.location || undefined,
          url: jobInfo.url,
        },
        style
      );

      if (result.success) {
        setGeneratedResult(result.data);
      } else {
        alert(result.error || "자기소개서 생성에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("Cover letter generation error:", error);
      alert(error.response?.data?.detail || "자기소개서 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewCoverLetter = async () => {
    if (!userCoverLetter.trim()) {
      alert("검토할 자기소개서를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const result = await applicationService.reviewCoverLetter(
        userCoverLetter,
        {
          jobId: jobInfo.jobId,
          title: jobInfo.title,
          company: jobInfo.company,
          description: jobInfo.description || undefined,
        },
        userId
      );

      if (result.success) {
        setReviewResult(result.data);
      } else {
        alert(result.error || "피드백 생성에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("Review error:", error);
      alert(error.response?.data?.detail || "피드백 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleGetTips = async () => {
    setLoading(true);
    try {
      const result = await applicationService.getApplicationTips(
        userId,
        {
          jobId: jobInfo.jobId,
          title: jobInfo.title,
          company: jobInfo.company,
          description: jobInfo.description || undefined,
          location: jobInfo.location || undefined,
        }
      );

      if (result.success) {
        setTipsResult(result.data);
      } else {
        alert(result.error || "팁 생성에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("Tips error:", error);
      alert(error.response?.data?.detail || "팁 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("클립보드에 복사되었습니다.");
  };

  const getFullCoverLetter = () => {
    if (!generatedResult?.coverLetter) return "";
    const { opening, body, closing } = generatedResult.coverLetter;
    return `${opening}\n\n${body}\n\n${closing}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl transform transition-all max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI 지원서 작성 도우미</h2>
              <p className="text-sm text-gray-600 mt-1">
                {jobInfo.company} - {jobInfo.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {[
              { id: "generate", label: "자기소개서 생성", icon: "✍️" },
              { id: "review", label: "자기소개서 피드백", icon: "📝" },
              { id: "tips", label: "지원 팁", icon: "💡" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 200px)" }}>
            {/* Generate Tab */}
            {activeTab === "generate" && (
              <div className="space-y-6">
                {!generatedResult ? (
                  <>
                    {/* Style Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        작성 스타일 선택
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: "professional", label: "전문적", desc: "격식 있고 구체적인 성과 강조" },
                          { id: "passionate", label: "열정적", desc: "진정성과 동기 부여 강조" },
                          { id: "creative", label: "창의적", desc: "개성 있고 독특한 관점" },
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setStyle(s.id as any)}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              style === s.id
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="font-medium text-gray-900">{s.label}</div>
                            <div className="text-xs text-gray-500 mt-1">{s.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateCoverLetter}
                      disabled={loading}
                      className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          AI가 자기소개서를 작성하고 있습니다...
                        </>
                      ) : (
                        <>
                          <span>✨</span>
                          자기소개서 초안 생성하기
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Generated Cover Letter */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">생성된 자기소개서</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(getFullCoverLetter())}
                            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            📋 전체 복사
                          </button>
                          <button
                            onClick={() => setGeneratedResult(null)}
                            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            🔄 다시 생성
                          </button>
                        </div>
                      </div>

                      {/* Opening */}
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-800">도입부</span>
                          <button
                            onClick={() => copyToClipboard(generatedResult.coverLetter.opening)}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            복사
                          </button>
                        </div>
                        <p className="text-gray-800 whitespace-pre-wrap">{generatedResult.coverLetter.opening}</p>
                      </div>

                      {/* Body */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-800">본론</span>
                          <button
                            onClick={() => copyToClipboard(generatedResult.coverLetter.body)}
                            className="text-xs text-gray-600 hover:text-gray-700"
                          >
                            복사
                          </button>
                        </div>
                        <p className="text-gray-800 whitespace-pre-wrap">{generatedResult.coverLetter.body}</p>
                      </div>

                      {/* Closing */}
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-800">마무리</span>
                          <button
                            onClick={() => copyToClipboard(generatedResult.coverLetter.closing)}
                            className="text-xs text-green-600 hover:text-green-700"
                          >
                            복사
                          </button>
                        </div>
                        <p className="text-gray-800 whitespace-pre-wrap">{generatedResult.coverLetter.closing}</p>
                      </div>

                      {/* Highlights */}
                      {generatedResult.highlights?.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">강조 포인트</h4>
                          <div className="flex flex-wrap gap-2">
                            {generatedResult.highlights.map((h, idx) => (
                              <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                                {h}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tips */}
                      {generatedResult.tips?.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">작성 팁</h4>
                          <div className="space-y-2">
                            {generatedResult.tips.map((tip, idx) => (
                              <div key={idx} className="p-3 bg-yellow-50 rounded-lg">
                                <div className="font-medium text-yellow-800 text-sm">{tip.category}</div>
                                <div className="text-gray-700 text-sm mt-1">{tip.tip}</div>
                                {tip.example && (
                                  <div className="text-gray-600 text-xs mt-1 italic">예: {tip.example}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warnings */}
                      {generatedResult.warnings?.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">주의사항</h4>
                          <ul className="space-y-1">
                            {generatedResult.warnings.map((w, idx) => (
                              <li key={idx} className="text-sm text-orange-700 flex items-start gap-2">
                                <span>⚠️</span>
                                <span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Review Tab */}
            {activeTab === "review" && (
              <div className="space-y-6">
                {!reviewResult ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        검토할 자기소개서를 입력하세요
                      </label>
                      <textarea
                        value={userCoverLetter}
                        onChange={(e) => setUserCoverLetter(e.target.value)}
                        placeholder="자기소개서 내용을 붙여넣으세요..."
                        className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {userCoverLetter.length}자
                      </p>
                    </div>

                    <button
                      onClick={handleReviewCoverLetter}
                      disabled={loading || !userCoverLetter.trim()}
                      className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          AI가 분석하고 있습니다...
                        </>
                      ) : (
                        <>
                          <span>📝</span>
                          피드백 받기
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="space-y-6">
                    <button
                      onClick={() => setReviewResult(null)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      ← 다른 자기소개서 검토하기
                    </button>

                    {/* Overall Score */}
                    <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                      <div className="text-5xl font-bold text-blue-600 mb-2">
                        {reviewResult.overallScore}점
                      </div>
                      <p className="text-gray-600">종합 점수</p>
                      <p className="text-gray-700 mt-2">{reviewResult.overallFeedback}</p>
                    </div>

                    {/* Detailed Scores */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">항목별 점수</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: "relevance", label: "직무 관련성" },
                          { key: "specificity", label: "구체성" },
                          { key: "differentiation", label: "차별화" },
                          { key: "authenticity", label: "진정성" },
                          { key: "structure", label: "구조/가독성" },
                        ].map((item) => {
                          const score = reviewResult.scores[item.key as keyof typeof reviewResult.scores];
                          return (
                            <div key={item.key} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{item.label}</span>
                                <span className={`font-bold ${
                                  score.score >= 80 ? "text-green-600" :
                                  score.score >= 60 ? "text-yellow-600" : "text-red-600"
                                }`}>
                                  {score.score}점
                                </span>
                              </div>
                              <p className="text-xs text-gray-600">{score.feedback}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Strengths */}
                    {reviewResult.strengths?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <span className="text-green-500">✓</span> 잘한 점
                        </h4>
                        <ul className="space-y-1">
                          {reviewResult.strengths.map((s, idx) => (
                            <li key={idx} className="text-sm text-green-700 bg-green-50 p-2 rounded">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improvements */}
                    {reviewResult.improvements?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <span className="text-yellow-500">!</span> 개선이 필요한 부분
                        </h4>
                        <div className="space-y-3">
                          {reviewResult.improvements.map((imp, idx) => (
                            <div key={idx} className="p-3 bg-yellow-50 rounded-lg">
                              <div className="font-medium text-yellow-800 text-sm">{imp.issue}</div>
                              <div className="text-gray-700 text-sm mt-1">{imp.suggestion}</div>
                              {imp.example && (
                                <div className="text-gray-600 text-xs mt-1 p-2 bg-white rounded italic">
                                  예시: {imp.example}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rewrite Suggestions */}
                    {reviewResult.rewriteSuggestions?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">문장 수정 제안</h4>
                        <div className="space-y-3">
                          {reviewResult.rewriteSuggestions.map((sug, idx) => (
                            <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm">
                                <span className="text-red-600 line-through">{sug.original}</span>
                              </div>
                              <div className="text-sm mt-1">
                                <span className="text-green-600">→ {sug.improved}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">{sug.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tips Tab */}
            {activeTab === "tips" && (
              <div className="space-y-6">
                {!tipsResult ? (
                  <button
                    onClick={handleGetTips}
                    disabled={loading}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        맞춤형 팁을 생성하고 있습니다...
                      </>
                    ) : (
                      <>
                        <span>💡</span>
                        맞춤형 지원 팁 받기
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-6">
                    <button
                      onClick={() => setTipsResult(null)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      ← 다시 분석하기
                    </button>

                    {/* Overall Strategy */}
                    {tipsResult.overallStrategy && (
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                        <h4 className="font-medium text-purple-900 mb-2">전체 지원 전략</h4>
                        <p className="text-gray-700">{tipsResult.overallStrategy}</p>
                      </div>
                    )}

                    {/* Document Tips */}
                    {tipsResult.documentTips?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">서류 작성 팁</h4>
                        <div className="space-y-2">
                          {tipsResult.documentTips.map((tip: any, idx: number) => (
                            <div key={idx} className={`p-3 rounded-lg ${
                              tip.priority === "high" ? "bg-red-50 border-l-4 border-red-400" :
                              tip.priority === "medium" ? "bg-yellow-50 border-l-4 border-yellow-400" :
                              "bg-gray-50 border-l-4 border-gray-300"
                            }`}>
                              <div className="font-medium text-gray-900 text-sm">{tip.title}</div>
                              <div className="text-gray-600 text-sm mt-1">{tip.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interview Prep */}
                    {tipsResult.interviewPrep?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">예상 면접 질문</h4>
                        <div className="space-y-3">
                          {tipsResult.interviewPrep.map((prep: any, idx: number) => (
                            <div key={idx} className="p-4 bg-blue-50 rounded-lg">
                              <div className="font-medium text-blue-900">Q. {prep.question}</div>
                              <div className="text-gray-700 text-sm mt-2">
                                <span className="font-medium">답변 방향:</span> {prep.suggestedAnswer}
                              </div>
                              {prep.yourStrength && (
                                <div className="text-green-700 text-sm mt-1">
                                  <span className="font-medium">활용할 강점:</span> {prep.yourStrength}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dos and Don'ts */}
                    {tipsResult.dosDonts && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h4 className="font-medium text-green-900 mb-2">Do's</h4>
                          <ul className="space-y-1">
                            {tipsResult.dosDonts.dos?.map((item: string, idx: number) => (
                              <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                                <span>✓</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg">
                          <h4 className="font-medium text-red-900 mb-2">Don'ts</h4>
                          <ul className="space-y-1">
                            {tipsResult.dosDonts.donts?.map((item: string, idx: number) => (
                              <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                                <span>✗</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Key Messages */}
                    {tipsResult.keyMessages?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">핵심 어필 메시지</h4>
                        <div className="flex flex-wrap gap-2">
                          {tipsResult.keyMessages.map((msg: string, idx: number) => (
                            <span key={idx} className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm">
                              "{msg}"
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
