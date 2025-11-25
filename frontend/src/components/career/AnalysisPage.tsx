'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { analysisService } from '@/lib/api';
import {
  ArrowLeft,
  Heart,
  User,
  Sparkles,
  Briefcase,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { AnalysisResponse, RadarChartData, BarChartData } from '@/types';
import './AnalysisPage.css';

interface AnalysisPageProps {
  sessionId: string;
}

export default function AnalysisPage({ sessionId }: AnalysisPageProps) {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const fetchAnalysis = async () => {
    try {
      setIsLoading(true);
      const data = await analysisService.analyzeSession(sessionId);
      setAnalysis(data);
    } catch (error: any) {
      console.error('❌ 분석 실패:', error);
      console.error('에러 상세:', error.response?.data);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        '분석을 불러오는 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const prepareInterestData = (): RadarChartData[] => {
    if (!analysis?.interest?.areas) {
      console.warn('⚠️ 흥미 데이터가 없습니다:', analysis?.interest);
      return [];
    }
    const chartData = analysis.interest.areas.map((area) => ({
      subject: area.name,
      value: area.level * 10, // 1-10을 10-100으로 변환
    }));
    return chartData;
  };

  const prepareCareerMatchData = (): BarChartData[] => {
    if (!analysis?.recommendedCareers) {
      console.warn('⚠️ 진로 추천 데이터가 없습니다:', analysis?.recommendedCareers);
      return [];
    }
    const chartData = analysis.recommendedCareers.map((career) => ({
      name: career.careerName,
      matchScore: career.matchScore,
    }));
    return chartData;
  };

  if (isLoading) {
    return (
      <div className="analysis-page">
        <div className="loading-full">
          <Loader2 className="spinner-large" />
          <h2>AI가 대화 내용을 분석하고 있습니다...</h2>
          <p>감정, 성향, 흥미를 종합적으로 분석 중입니다.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-page">
        <div className="error-container">
          <h2>오류 발생</h2>
          <p>{error}</p>
          <button onClick={() => router.push('/')} className="back-button">
            <ArrowLeft size={20} />
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="analysis-page">
      <div className="analysis-container">
        <div className="analysis-header">
          <button onClick={() => router.push('/')} className="back-button">
            <ArrowLeft size={20} />
            대화로 돌아가기
          </button>
          <h1> 진로 분석 결과</h1>
          <p>AI가 대화를 통해 분석한 당신의 진로 방향입니다</p>
        </div>

        <div className="analysis-content">
          {/* 감정 분석 */}
          <section className="analysis-section emotion-section">
            <div className="section-header">
              <Heart className="section-icon" />
              <h2>감정 분석</h2>
            </div>
            <div className="section-content">
              <div className="emotion-score">
                <div className="score-circle">
                  <svg viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="rgba(50, 50, 50, 0.6)"
                      strokeWidth="20"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="20"
                      strokeDasharray={`${analysis.emotion.score * 5.65} 565`}
                      strokeLinecap="round"
                      transform="rotate(-90 100 100)"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#D4AF37" />
                        <stop offset="100%" stopColor="#C4A030" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="score-text">
                    <span className="score-number">{analysis.emotion.score}</span>
                    <span className="score-label">점</span>
                  </div>
                </div>
                <div className="emotion-info">
                  <div className="emotion-state">
                    <span className="label">감정 상태:</span>
                    <span className="value">{analysis.emotion.emotionalState}</span>
                  </div>
                  <p className="description">{analysis.emotion.description}</p>
                </div>
              </div>
            </div>
          </section>

          {/* 성향 분석 */}
          <section className="analysis-section personality-section">
            <div className="section-header">
              <User className="section-icon" />
              <h2>성향 분석</h2>
            </div>
            <div className="section-content">
              <div className="personality-type">
                <span className="type-badge">{analysis.personality.type}</span>
              </div>
              <p className="description">{analysis.personality.description}</p>

              <div className="traits-grid">
                <div className="trait-box strengths">
                  <h3>
                    <TrendingUp size={18} />
                    강점
                  </h3>
                  <ul>
                    {analysis.personality.strengths && analysis.personality.strengths.length > 0 ? (
                      analysis.personality.strengths.map((strength, index) => (
                        <li key={index}>{strength}</li>
                      ))
                    ) : (
                      <li style={{ color: '#888', border: 'none' }}>강점을 분석 중입니다...</li>
                    )}
                  </ul>
                </div>
                <div className="trait-box growth">
                  <h3>
                    <Sparkles size={18} />
                    발전 영역
                  </h3>
                  <ul>
                    {analysis.personality.growthAreas && analysis.personality.growthAreas.length > 0 ? (
                      analysis.personality.growthAreas.map((area, index) => (
                        <li key={index}>{area}</li>
                      ))
                    ) : (
                      <li style={{ color: '#888', border: 'none' }}>발전 영역을 분석 중입니다...</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 흥미 분석 */}
          <section className="analysis-section interest-section">
            <div className="section-header">
              <Sparkles className="section-icon" />
              <h2>흥미 분석</h2>
            </div>
            <div className="section-content">
              <p className="description">{analysis.interest.description}</p>

              {analysis.interest.areas && analysis.interest.areas.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={prepareInterestData()}>
                      <PolarGrid stroke="rgba(212, 175, 55, 0.2)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#D4AF37', fontSize: 12 }} />
                      <Radar
                        name="흥미도"
                        dataKey="value"
                        stroke="#D4AF37"
                        fill="#D4AF37"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                  <p>흥미 분야 데이터를 분석 중입니다...</p>
                </div>
              )}

              {analysis.interest.areas && analysis.interest.areas.length > 0 && (
                <div className="interest-list">
                  {analysis.interest.areas.map((area, index) => (
                    <div key={index} className="interest-item">
                      <div className="interest-header">
                        <span className="interest-name">{area.name}</span>
                        <span className="interest-level">Lv. {area.level}/10</span>
                      </div>
                      <div className="interest-bar">
                        <div
                          className="interest-fill"
                          style={{ width: `${area.level * 10}%` }}
                        />
                      </div>
                      <p className="interest-description">{area.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 종합 분석 */}
          <section className="analysis-section comprehensive-section">
            <div className="section-header">
              <Briefcase className="section-icon" />
              <h2>종합 분석</h2>
            </div>
            <div className="section-content">
              <div className="comprehensive-text">{analysis.comprehensiveAnalysis}</div>
            </div>
          </section>

          {/* 추천 진로 */}
          <section className="analysis-section career-section">
            <div className="section-header">
              <Briefcase className="section-icon" />
              <h2>추천 진로</h2>
            </div>
            <div className="section-content">
              {analysis.recommendedCareers && analysis.recommendedCareers.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepareCareerMatchData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 175, 55, 0.2)" />
                      <XAxis dataKey="name" tick={{ fill: '#D4AF37', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#D4AF37', fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(20, 20, 20, 0.95)', 
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          borderRadius: '8px',
                          color: '#D4AF37'
                        }}
                      />
                      <Legend wrapperStyle={{ color: '#D4AF37' }} />
                      <Bar dataKey="matchScore" fill="url(#barGradient)" name="매칭 점수" />
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D4AF37" />
                          <stop offset="100%" stopColor="#C4A030" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                  <p>진로 추천 데이터를 분석 중입니다...</p>
                </div>
              )}

              {analysis.recommendedCareers && analysis.recommendedCareers.length > 0 && (
                <div className="career-list">
                  {analysis.recommendedCareers.map((career, index) => (
                    <div key={index} className="career-card">
                      <div className="career-header">
                        <h3>{career.careerName}</h3>
                        <span className="match-badge">{career.matchScore}% 매칭</span>
                      </div>
                      <p className="career-description">{career.description}</p>
                      <div className="career-reasons">
                        <h4>추천 이유:</h4>
                        <ul>
                          {career.reasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

