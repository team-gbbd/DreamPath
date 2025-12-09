/**
 * SearchProgressIndicator - AI 검색 진행 상태 표시 컴포넌트
 *
 * 리서치 패널에서 AI가 검색 중일 때 진행 상태를 시각화
 */

interface SearchProgressIndicatorProps {
  isSearching: boolean;
  query?: string;
}

export default function SearchProgressIndicator({ isSearching, query }: SearchProgressIndicatorProps) {
  if (!isSearching) return null;

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200/50 animate-pulse">
      {/* 헤더 */}
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full flex items-center justify-center">
          <i className="ri-search-line text-white text-xs animate-pulse"></i>
        </div>
        <span className="text-sm font-medium text-gray-700">AI가 정보를 검색하고 있어요</span>
      </div>

      {/* 검색어 표시 */}
      {query && (
        <div className="mb-3 px-3 py-2 bg-white/60 rounded-lg border border-orange-100">
          <span className="text-xs text-gray-500">검색 중: </span>
          <span className="text-sm text-orange-700 font-medium">{query}</span>
        </div>
      )}

      {/* 프로그레스 바 */}
      <div className="relative h-1.5 bg-orange-100 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full animate-progress"
          style={{
            animation: 'progress 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* 진행 단계 */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center space-x-2 text-xs text-gray-600">
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-check-line text-green-500"></i>
          </span>
          <span>웹에서 정보 수집</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-600">
          <span className="w-4 h-4 flex items-center justify-center">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-ping"></div>
          </span>
          <span>데이터 분석 중...</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-time-line"></i>
          </span>
          <span>요약 생성 대기</span>
        </div>
      </div>

      {/* 스타일 추가 */}
      <style>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  );
}
