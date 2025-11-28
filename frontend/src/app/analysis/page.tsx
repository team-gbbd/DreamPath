'use client';

import { useSearchParams } from 'next/navigation';
import AnalysisPage from '@/components/career/AnalysisPage';
import { Suspense } from 'react';

function AnalysisPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('sessionId') || null;

  if (!sessionId) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'white',
        textAlign: 'center'
      }}>
        <div>
          <h2>세션 ID가 필요합니다</h2>
          <p>채팅 페이지로 돌아가주세요.</p>
        </div>
      </div>
    );
  }

  return <AnalysisPage sessionId={sessionId} />;
}

export default function Analysis() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'white'
      }}>
        로딩 중...
      </div>
    }>
      <AnalysisPageContent />
    </Suspense>
  );
}

