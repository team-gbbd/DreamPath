import { useState } from "react";

interface InquiryFormProps {
  onSubmit: (data: InquiryData) => Promise<void>;
  onCancel: () => void;
  defaultName?: string;
  defaultEmail?: string;
  isLoggedIn?: boolean;
}

export interface InquiryData {
  name: string;
  email: string;
  content: string;
}

interface InquiryErrors {
  name: string;
  email: string;
  content: string;
}

export default function InquiryForm({
  onSubmit,
  onCancel,
  defaultName = "",
  defaultEmail = "",
  isLoggedIn = false,
}: InquiryFormProps) {
  const [data, setData] = useState<InquiryData>({
    name: defaultName,
    email: defaultEmail,
    content: "",
  });

  const [errors, setErrors] = useState<InquiryErrors>({
    name: "",
    email: "",
    content: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (field: keyof InquiryData, value: string) => {
    setData({ ...data, [field]: value });
    if (value.trim()) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleSubmit = async () => {
    const newErrors = { name: "", email: "", content: "" };
    let hasError = false;

    if (!data.name.trim()) {
      newErrors.name = "이름을 입력해주세요.";
      hasError = true;
    }

    if (!data.email.trim()) {
      newErrors.email = "이메일을 입력해주세요.";
      hasError = true;
    } else if (!validateEmail(data.email)) {
      newErrors.email = "이메일 형식으로 입력해주세요.";
      hasError = true;
    }

    if (!data.content.trim()) {
      newErrors.content = "문의 내용을 입력해주세요.";
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-md max-w-[90%]">
      <h3 className="text-sm font-semibold mb-3">문의하기</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">이름</label>
          <input
            type="text"
            className={`w-full border rounded-lg px-3 py-2 text-sm ${
              errors.name ? "border-red-500" : "border-gray-300"
            } ${isLoggedIn ? "bg-gray-100 cursor-not-allowed" : ""}`}
            placeholder="이름을 입력하세요"
            value={data.name}
            onChange={(e) => handleChange("name", e.target.value)}
            readOnly={isLoggedIn}
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">이메일</label>
          <input
            type="email"
            className={`w-full border rounded-lg px-3 py-2 text-sm ${
              errors.email ? "border-red-500" : "border-gray-300"
            } ${isLoggedIn ? "bg-gray-100 cursor-not-allowed" : ""}`}
            placeholder="email@example.com"
            value={data.email}
            onChange={(e) => handleChange("email", e.target.value)}
            readOnly={isLoggedIn}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">문의 내용</label>
          <textarea
            className={`w-full border rounded-lg px-3 py-2 text-sm resize-none ${
              errors.content ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="문의 내용을 입력하세요"
            rows={4}
            value={data.content}
            onChange={(e) => handleChange("content", e.target.value)}
          />
          {errors.content && (
            <p className="text-red-500 text-xs mt-1">{errors.content}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-lg text-sm hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
          >
            {submitting ? "보내는 중..." : "보내기"}
          </button>
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-300 disabled:opacity-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
