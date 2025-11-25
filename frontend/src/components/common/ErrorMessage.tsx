/**
 * 에러 메시지 컴포넌트
 */

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export default function ErrorMessage({
  message,
  onRetry,
  fullScreen = false
}: ErrorMessageProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
        <i className="ri-error-warning-line text-3xl text-red-500" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          오류가 발생했습니다
        </h3>
        <p className="text-gray-600 max-w-md">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <i className="ri-refresh-line" />
          다시 시도
        </button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {content}
    </div>
  );
}
