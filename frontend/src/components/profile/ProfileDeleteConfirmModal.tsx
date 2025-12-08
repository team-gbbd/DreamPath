import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '@/lib/api';

type ProfileDeleteConfirmModalProps = {
  open: boolean;
  profileId: number | null;
  onClose: () => void;
  onDeleted?: () => void;
};

export default function ProfileDeleteConfirmModal({
  open,
  profileId,
  onClose,
  onDeleted,
}: ProfileDeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!open) return null;
  const disabled = !profileId || isDeleting;

  const handleDelete = async () => {
    if (!profileId) return;
    try {
      setIsDeleting(true);
      setError(null);
      await profileService.deleteProfile(profileId);
      onDeleted?.();
      onClose();
      navigate('/profile/list');
    } catch (err) {
      console.error('프로필 삭제 실패', err);
      const message = err instanceof Error ? err.message : '프로필 삭제 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-white/70 p-8 space-y-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-500">
            <i className="ri-error-warning-line text-2xl" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">프로필을 삭제하시겠어요?</h3>
          <p className="text-sm text-gray-600">
            삭제된 프로필은 되돌릴 수 없습니다. 정말 삭제하려면 확인 버튼을 눌러주세요.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-2xl p-3 text-center">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <button
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-50"
            onClick={onClose}
            disabled={isDeleting}
          >
            취소
          </button>
          <button
            className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold shadow-lg shadow-red-200 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleDelete}
            disabled={disabled}
          >
            {isDeleting ? '삭제 중...' : '확인'}
          </button>
        </div>
      </div>
    </div>
  );
}
