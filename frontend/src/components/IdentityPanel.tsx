'use client';

import { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, Eye, Heart, Target, Zap } from 'lucide-react';
import './IdentityPanel.css';

interface IdentityTrait {
  category: string;
  trait: string;
  evidence: string;
}

interface RecentInsight {
  hasInsight: boolean;
  insight?: string;
  type?: string;
}

interface IdentityStatus {
  sessionId: string;
  currentStage: string;
  stageDescription: string;
  overallProgress: number;
  clarity: number;
  clarityReason: string;
  identityCore: string;
  confidence: number;
  traits: IdentityTrait[];
  insights: string[];
  nextFocus: string;
  recentInsight?: RecentInsight;
}

interface IdentityPanelProps {
  identityStatus: IdentityStatus | null;
  stageChanged: boolean;
}

export default function IdentityPanel({ identityStatus, stageChanged }: IdentityPanelProps) {
  const [showInsight, setShowInsight] = useState(false);
  const [animateStage, setAnimateStage] = useState(false);

  useEffect(() => {
    if (identityStatus?.recentInsight?.hasInsight) {
      setShowInsight(true);
      const timer = setTimeout(() => setShowInsight(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [identityStatus?.recentInsight]);

  useEffect(() => {
    if (stageChanged) {
      setAnimateStage(true);
      const timer = setTimeout(() => setAnimateStage(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [stageChanged]);

  if (!identityStatus) {
    return (
      <div className="identity-panel">
        <div className="panel-placeholder">
          <Sparkles size={48} className="placeholder-icon" />
          <p>대화를 시작하면 당신의 정체성이<br />점진적으로 드러납니다</p>
        </div>
      </div>
    );
  }

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case '현재': return <Heart size={20} />;
      case '과거': return <Eye size={20} />;
      case '가치관': return <Target size={20} />;
      case '미래': return <TrendingUp size={20} />;
      case '정체성': return <Sparkles size={20} />;
      default: return <Sparkles size={20} />;
    }
  };

  const getClarityLevel = (clarity: number) => {
    if (clarity < 20) return { text: '탐색 시작', color: '#64748b' };
    if (clarity < 40) return { text: '단서 발견', color: '#3b82f6' };
    if (clarity < 60) return { text: '윤곽 드러남', color: '#8b5cf6' };
    if (clarity < 80) return { text: '명확해짐', color: '#ec4899' };
    return { text: '확립됨', color: '#10b981' };
  };

  const clarityLevel = getClarityLevel(identityStatus.clarity);

  return (
    <div className="identity-panel">
      {/* 인사이트 알림 */}
      {showInsight && identityStatus.recentInsight?.hasInsight && (
        <div className="insight-notification">
          <Zap size={16} />
          <span>{identityStatus.recentInsight.insight}</span>
        </div>
      )}

      {/* 현재 단계 */}
      <div className={`stage-indicator ${animateStage ? 'stage-change' : ''}`}>
        <div className="stage-icon">
          {getStageIcon(identityStatus.currentStage)}
        </div>
        <div className="stage-info">
          <div className="stage-name">{identityStatus.currentStage}</div>
          <div className="stage-desc">{identityStatus.stageDescription}</div>
        </div>
        <div className="stage-progress">{identityStatus.overallProgress}%</div>
      </div>

      {/* 정체성 명확도 */}
      <div className="clarity-section">
        <div className="section-header">
          <Sparkles size={16} />
          <span>정체성 명확도</span>
        </div>
        <div className="clarity-bar-container">
          <div 
            className="clarity-bar" 
            style={{ 
              width: `${identityStatus.clarity}%`,
              backgroundColor: clarityLevel.color
            }}
          >
            <span className="clarity-percentage">{identityStatus.clarity}%</span>
          </div>
        </div>
        <div className="clarity-level" style={{ color: clarityLevel.color }}>
          {clarityLevel.text}
        </div>
        <p className="clarity-reason">{identityStatus.clarityReason}</p>
      </div>

      {/* 핵심 정체성 */}
      <div className="identity-core-section">
        <div className="section-header">
          <Target size={16} />
          <span>지금까지의 당신</span>
        </div>
        <div className={`identity-core ${identityStatus.confidence > 50 ? 'confident' : ''}`}>
          {identityStatus.identityCore}
        </div>
        {identityStatus.confidence > 0 && (
          <div className="confidence-badge">
            확신도 {identityStatus.confidence}%
          </div>
        )}
      </div>

      {/* 발견된 특징 */}
      {identityStatus.traits.length > 0 && (
        <div className="traits-section">
          <div className="section-header">
            <Eye size={16} />
            <span>발견된 특징</span>
          </div>
          <div className="traits-list">
            {identityStatus.traits.map((trait, idx) => (
              <div key={idx} className="trait-item">
                <div className="trait-category">{trait.category}</div>
                <div className="trait-name">{trait.trait}</div>
                <div className="trait-evidence">{trait.evidence}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 인사이트 */}
      {identityStatus.insights.length > 0 && (
        <div className="insights-section">
          <div className="section-header">
            <Zap size={16} />
            <span>발견한 것들</span>
          </div>
          <ul className="insights-list">
            {identityStatus.insights.map((insight, idx) => (
              <li key={idx}>{insight}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 다음 탐색 영역 */}
      {identityStatus.nextFocus && (
        <div className="next-focus">
          <TrendingUp size={14} />
          <span>{identityStatus.nextFocus}</span>
        </div>
      )}
    </div>
  );
}

