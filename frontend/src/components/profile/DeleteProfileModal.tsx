import { useState } from 'react';
import { API_BASE_URL, authFetch } from '@/lib/api';

interface DeleteProfileModalProps {
  isOpen: boolean;
  onClose?: () => void;
  profileId?: number | null;
  onDeleted?: (profileId: number) => void;
}

const DeleteProfileModal = ({ isOpen, onClose, profileId, onDeleted }: DeleteProfileModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !profileId) return null;

  const handleDelete = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      setError(null);
      const response = await authFetch(`${API_BASE_URL}/profiles/${profileId}`, {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 204) {
        const message = await response.text();
        throw new Error(message || '프로필 삭제에 실패했습니다.');
      }
      onDeleted?.(profileId);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900">프로필 삭제</h2>
        <p className="mt-2 text-gray-600">정말로 이 프로필을 삭제하시겠습니까? 삭제 시 분석 데이터도 함께 제거됩니다.</p>
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
            disabled={isDeleting}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={`rounded-lg px-4 py-2 font-semibold text-white transition ${
              isDeleting ? 'bg-red-300' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteProfileModal;
