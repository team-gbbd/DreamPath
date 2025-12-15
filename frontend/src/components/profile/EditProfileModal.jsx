import { useEffect, useState } from 'react';
import { API_BASE_URL, authFetch } from '@/lib/api';

const defaultFormState = (initial) => ({
  name: initial?.user?.name ?? initial?.name ?? '',
  phone: initial?.user?.phone ?? initial?.phone ?? '',
  interests: initial?.interests ?? '',
  values: initial?.values ?? '',
  emotions: initial?.emotions ?? '',
  personalityTraits: initial?.personalityTraits ?? '',
  confidenceScore: initial?.confidenceScore ?? 0,
});

const EditProfileModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formState, setFormState] = useState(defaultFormState(initialData));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormState(defaultFormState(initialData));
      setErrorMessage(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const profileId = initialData?.profileId;
    const userId = initialData?.user?.userId ?? initialData?.userId;
    if (!profileId || !userId) {
      setErrorMessage('프로필 정보를 찾을 수 없습니다.');
      return;
    }

    if (!formState.interests.trim() || !formState.values.trim() || !formState.emotions.trim()) {
      setErrorMessage('관심/가치관/감정 정보를 모두 입력해주세요.');
      return;
    }

    const payload = {
      userId,
      personalityTraits: formState.personalityTraits || initialData?.personalityTraits || 'N/A',
      values: formState.values,
      interests: formState.interests,
      emotions: formState.emotions,
      confidenceScore: typeof formState.confidenceScore === 'number' ? formState.confidenceScore : 0,
    };

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const response = await authFetch(`${API_BASE_URL}/profiles/${profileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || '프로필 업데이트에 실패했습니다.');
      }

      const updatedProfile = await response.json();
      setFormState(defaultFormState(updatedProfile));
      onSubmit?.(updatedProfile);
      onClose?.();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormState(defaultFormState(initialData));
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">프로필 수정</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-500">기본 정보와 관심 분야를 업데이트하세요.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">이름</label>
            <input
              type="text"
              value={formState.name}
              onChange={handleChange('name')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              placeholder="홍길동"
              />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">전화번호</label>
            <input
              type="tel"
              value={formState.phone}
              onChange={handleChange('phone')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              placeholder="010-0000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">관심 분야</label>
            <textarea
              value={formState.interests}
              onChange={handleChange('interests')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              rows={3}
              placeholder="관심있는 주제나 기술을 적어주세요."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">가치관</label>
            <textarea
              value={formState.values}
              onChange={handleChange('values')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              rows={3}
              placeholder="중요하게 생각하는 가치관을 적어주세요."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">감정 패턴</label>
            <textarea
              value={formState.emotions}
              onChange={handleChange('emotions')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              rows={3}
              placeholder="감정 변화나 패턴을 적어주세요."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            {errorMessage && <p className="mr-auto text-sm text-red-500">{errorMessage}</p>}
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`rounded-lg px-4 py-2 font-semibold text-white transition ${
                isSubmitting ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
