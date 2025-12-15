import { useState } from "react";
import { cn } from "@/lib/utils";

interface InquiryFormProps {
  onSubmit: (data: InquiryData) => Promise<void>;
  onCancel: () => void;
  defaultName?: string;
  defaultEmail?: string;
  isLoggedIn?: boolean;
  darkMode?: boolean;
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
  darkMode = false,
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

  const inputBaseClass = "w-full border rounded-lg px-3 py-2 text-sm outline-none transition-all";
  const inputClass = darkMode
    ? "bg-white/[0.03] border-white/[0.1] text-white placeholder:text-white/40 focus:border-violet-500/50"
    : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-violet-500";
  const inputDisabledClass = darkMode
    ? "bg-white/[0.02] cursor-not-allowed"
    : "bg-gray-100 cursor-not-allowed";

  return (
    <div className={cn(
      "rounded-xl p-3 sm:p-4 max-w-[95%] sm:max-w-[90%]",
      darkMode
        ? "bg-white/[0.03] border border-white/[0.08]"
        : "bg-white shadow-md"
    )}>
      <h3 className={cn(
        "text-sm font-semibold mb-3",
        darkMode ? "text-white" : "text-gray-900"
      )}>
        문의하기
      </h3>
      <div className="space-y-3">
        <div>
          <label className={cn(
            "block text-xs mb-1",
            darkMode ? "text-white/60" : "text-gray-600"
          )}>
            이름
          </label>
          <input
            type="text"
            className={cn(
              inputBaseClass,
              inputClass,
              errors.name && "border-red-500",
              isLoggedIn && inputDisabledClass
            )}
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
          <label className={cn(
            "block text-xs mb-1",
            darkMode ? "text-white/60" : "text-gray-600"
          )}>
            이메일
          </label>
          <input
            type="email"
            className={cn(
              inputBaseClass,
              inputClass,
              errors.email && "border-red-500",
              isLoggedIn && inputDisabledClass
            )}
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
          <label className={cn(
            "block text-xs mb-1",
            darkMode ? "text-white/60" : "text-gray-600"
          )}>
            문의 내용
          </label>
          <textarea
            className={cn(
              inputBaseClass,
              inputClass,
              "resize-none",
              errors.content && "border-red-500"
            )}
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
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all"
          >
            {submitting ? "보내는 중..." : "보내기"}
          </button>
          <button
            onClick={onCancel}
            disabled={submitting}
            className={cn(
              "px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50",
              darkMode
                ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.08]"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            )}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}