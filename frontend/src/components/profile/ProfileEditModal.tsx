import { useEffect, useState } from 'react';
import type { UserProfile } from '@/types';

type ProfileFormValues = {
  personalityTraits: string;
  values: string;
  interests: string;
  emotions: string;
  confidenceScore?: number;
};

type ProfileEditModalProps = {
  open: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onSubmit: (payload: ProfileFormValues) => Promise<void> | void;
  submitting?: boolean;
};

const initialState: ProfileFormValues = {
  personalityTraits: '',
  values: '',
  interests: '',
  emotions: '',
  confidenceScore: undefined,
};

export default function ProfileEditModal({
  open,
  profile,
  onClose,
  onSubmit,
  submitting = false,
}: ProfileEditModalProps) {
  const [form, setForm] = useState<ProfileFormValues>(initialState);

  useEffect(() => {
    if (profile) {
      setForm({
        personalityTraits: profile.personalityTraits ?? '',
        values: profile.values ?? '',
        interests: profile.interests ?? '',
        emotions: profile.emotions ?? '',
        confidenceScore: profile.confidenceScore,
      });
    } else {
      setForm(initialState);
    }
  }, [profile, open]);

  if (!open) return null;

  const handleChange = (field: keyof ProfileFormValues, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: field === 'confidenceScore' ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.personalityTraits?.trim() || !form.values?.trim() || !form.interests?.trim() || !form.emotions?.trim()) {
      alert('모든 항목을 입력해주세요.');
      return;
    }
    onSubmit({
      personalityTraits: form.personalityTraits.trim(),
      values: form.values.trim(),
      interests: form.interests.trim(),
      emotions: form.emotions.trim(),
      confidenceScore: form.confidenceScore,
    });
  };

  const InputField = ({
    label,
    value,
    onChange,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
  }) => (
    <label className="flex flex-col gap-2 text-sm text-gray-700">
      <span className="font-semibold">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all p-3 min-h-[120px]"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-white/80 p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-semibold">Edit Profile</p>
            <h2 className="text-2xl font-bold text-gray-900">프로필 정보 수정</h2>
            <p className="text-sm text-gray-500 mt-1">기존 입력값이 자동으로 채워집니다.</p>
          </div>
          <button
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            onClick={onClose}
            aria-label="close"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <InputField
              label="성격 특성"
              value={form.personalityTraits}
              onChange={(value) => handleChange('personalityTraits', value)}
              placeholder="예) 팀을 이끌며 함께 성장하는 데 흥미를 느낍니다."
            />
            <InputField
              label="가치관"
              value={form.values}
              onChange={(value) => handleChange('values', value)}
              placeholder="예) 정직함과 성장 기회를 최우선으로 생각합니다."
            />
            <InputField
              label="관심 분야"
              value={form.interests}
              onChange={(value) => handleChange('interests', value)}
              placeholder="예) 데이터 활용 교육, 지속 가능한 비즈니스"
            />
            <InputField
              label="감정 패턴"
              value={form.emotions}
              onChange={(value) => handleChange('emotions', value)}
              placeholder="예) 구체적인 목표가 있을 때 높은 몰입감을 얻습니다."
            />
          </div>

          <label className="flex flex-col gap-2 text-sm text-gray-700 max-w-xs">
            <span className="font-semibold">확신도 (0~100)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={form.confidenceScore ?? ''}
              onChange={(e) => handleChange('confidenceScore', e.target.value)}
              placeholder="예) 85"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all p-3"
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              onClick={onClose}
              disabled={submitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-semibold shadow-lg shadow-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? '저장 중...' : '변경사항 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
