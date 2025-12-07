/**
 * TypingIndicator - AI 타이핑 중 표시 컴포넌트
 *
 * 간단한 bouncing dots 애니메이션으로 AI가 응답 중임을 표시
 */

interface TypingIndicatorProps {
  message?: string;
}

export default function TypingIndicator({ message = 'AI가 답변을 작성하고 있어요' }: TypingIndicatorProps) {
  return (
    <div className="flex justify-start">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl rounded-bl-sm px-5 py-4 max-w-[80%] border border-indigo-100/50 shadow-sm">
        {/* AI 아이콘 + 메시지 */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
            <i className="ri-robot-line text-white text-xs"></i>
          </div>
          <span className="text-sm text-gray-600">{message}</span>
        </div>

        {/* Bouncing Dots */}
        <div className="flex items-center space-x-1.5 pl-8">
          <span
            className="w-2.5 h-2.5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '0.6s' }}
          />
          <span
            className="w-2.5 h-2.5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms', animationDuration: '0.6s' }}
          />
          <span
            className="w-2.5 h-2.5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms', animationDuration: '0.6s' }}
          />
        </div>
      </div>
    </div>
  );
}
