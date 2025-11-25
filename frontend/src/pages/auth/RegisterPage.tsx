import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../../components/base/Button";
import Header from "../../components/feature/Header";
import { API_BASE_URL } from "@/lib/api";

const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>/?]/;

const hasSequentialOrRepeatedChars = (value: string) => {
  const normalized = value.toLowerCase();

  for (let i = 0; i < normalized.length - 2; i++) {
    const c1 = normalized.charCodeAt(i);
    const c2 = normalized.charCodeAt(i + 1);
    const c3 = normalized.charCodeAt(i + 2);

    if (c2 === c1 + 1 && c3 === c2 + 1) {
      return true;
    }

    if (normalized[i] === normalized[i + 1] && normalized[i + 1] === normalized[i + 2]) {
      return true;
    }
  }

  return false;
};

const resolveErrorMessage = (err: any, fallback: string) => {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  if (data && typeof data.message === "string") return data.message;
  if (err?.message) return err.message;
  return fallback;
};

const validatePassword = (password: string, username?: string) => {
  if (password.length < 8 || password.length > 20) {
    return false;
  }

  let types = 0;
  if (/[a-zA-Z]/.test(password)) types++;
  if (/[0-9]/.test(password)) types++;
  if (SPECIAL_CHAR_REGEX.test(password)) types++;

  if (types < 2) {
    return false;
  }

  if (hasSequentialOrRepeatedChars(password)) {
    return false;
  }

  if (username && username.length > 0 && password.toLowerCase().includes(username.toLowerCase())) {
    return false;
  }

  return true;
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    email: "",
    birth: "",
  });
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");

  useEffect(() => {
    setIsEmailVerified(false);
    setEmailVerificationCode("");
    setEmailStatus("");
  }, [form.email]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const isUsernameInvalid = useMemo(() => {
    if (!form.username) return false;
    return !/^[a-zA-Z0-9]{6,20}$/.test(form.username);
  }, [form.username]);

  const isPasswordInvalid = useMemo(() => {
    if (!form.password) return false;
    return !validatePassword(form.password, form.username);
  }, [form.password, form.username]);

  const isEmailInvalid = useMemo(() => {
    if (!form.email) return false;
    return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  }, [form.email]);

  const isConfirmPasswordInvalid = useMemo(() => {
    if (!form.confirmPassword) return false;
    return form.password !== form.confirmPassword;
  }, [form.password, form.confirmPassword]);

  const handleSendVerificationCode = async () => {
    if (!form.email) {
      alert("이메일을 입력해주세요.");
      return;
    }
    if (isEmailInvalid) {
      alert("올바른 이메일 형식을 입력해주세요.");
      return;
    }
    try {
      setIsSendingCode(true);
      await axios.post(`${API_BASE_URL}/auth/email/send`, { email: form.email });
      setEmailStatus("인증 코드가 발송되었습니다. 이메일을 확인해주세요.");
      setIsEmailVerified(false);
    } catch (err: any) {
      alert(resolveErrorMessage(err, "인증 코드 발송에 실패했습니다."));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!form.email || !emailVerificationCode) {
      alert("이메일과 인증 코드를 모두 입력해주세요.");
      return;
    }
    try {
      setIsVerifyingCode(true);
      await axios.post(`${API_BASE_URL}/auth/email/verify`, {
        email: form.email,
        code: emailVerificationCode,
      });
      setIsEmailVerified(true);
      setEmailStatus("이메일 인증이 완료되었습니다.");
    } catch (err: any) {
      setIsEmailVerified(false);
      setEmailStatus("");
      alert(resolveErrorMessage(err, "인증 코드 확인에 실패했습니다."));
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleRegister = async () => {
    try {
      if (form.password !== form.confirmPassword) {
        alert("비밀번호가 서로 일치하지 않습니다.");
        return;
      }

      const requiredFields: Array<keyof typeof form> = ["username", "password", "name", "phone", "birth", "email"];
      const hasEmptyRequired = requiredFields.some((key) => !form[key]);
      if (hasEmptyRequired) {
        alert("필수 입력값(아이디/비밀번호/이름/휴대폰/이메일/생년월일)을 모두 입력해주세요.");
        return;
      }

      if (!isEmailVerified) {
        alert("이메일 인증을 완료해주세요.");
        return;
      }

      const { confirmPassword, ...payload } = form;
      await axios.post(`${API_BASE_URL}/auth/register`, payload);
      alert("회원가입이 완료되었습니다!");
      setTimeout(() => navigate("/login", { replace: true }), 0);
    } catch (err: any) {
      alert(resolveErrorMessage(err, "회원가입 실패"));
    }
  };

  const heroBackgroundImage =
    "https://readdy.ai/api/search-image?query=Modern%20professional%20woman%20using%20AI%20technology%20for%20career%20guidance%2C%20futuristic%20interface%20with%20holographic%20career%20paths%2C%20soft%20blue%20and%20purple%20lighting%2C%20minimalist%20background%2C%20digital%20innovation%20concept%2C%20clean%20and%20inspiring%20atmosphere&width=800&height=1000&seq=hero-dreampath&orientation=portrait";

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      <Header />
      <div className="absolute inset-0 bg-gradient-to-r from-[#5A7BFF]/10 to-[#8F5CFF]/10"></div>
      <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-r from-[#8F5CFF] to-[#5A7BFF] rounded-full opacity-30 animate-bounce"></div>
      <div className="absolute bottom-32 left-20 w-12 h-12 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-full opacity-25"></div>
      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1/2 h-full opacity-30 hidden lg:block">
        <img
          src={heroBackgroundImage}
          alt="AI Career Guidance"
          className="w-full h-full object-cover object-top"
        />
      </div>
      <div className="relative flex-1 flex items-center justify-center z-10 px-4">
        <div className="w-full max-w-lg bg-white/80 backdrop-blur-xl shadow-xl rounded-2xl p-6">

          <h2 className="text-4xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">
              회원가입
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-2.5">
          <input
            name="username"
            placeholder="아이디"
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-[#8F5CFF]/60 focus:border-[#5A7BFF]/60 ${
              isUsernameInvalid ? "border-red-500" : "border-purple-200"
            } border`}
          />
          <p className={`text-xs mt-1 ${isUsernameInvalid ? "text-red-500" : "text-gray-600"}`}>
            아이디는 6~20자의 영문과 숫자 조합만 가능합니다. (특수문자/공백 불가)
          </p>

          <input
            name="password"
            type="password"
            placeholder="비밀번호"
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-[#8F5CFF]/60 focus:border-[#5A7BFF]/60 ${
              isPasswordInvalid ? "border-red-500" : "border-purple-200"
            } border`}
          />
          <p className={`text-xs mt-1 ${isPasswordInvalid ? "text-red-500" : "text-gray-600"}`}>
            비밀번호는 8~20자이며 영문/숫자/특수문자 중 2가지 이상 조합이어야 합니다.
          </p>
          <p className={`text-xs ${isPasswordInvalid ? "text-red-500" : "text-gray-600"}`}>
            연속된 문자 또는 아이디 포함은 불가합니다.
          </p>

          <input
            name="confirmPassword"
            type="password"
            placeholder="비밀번호 확인"
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-[#8F5CFF]/60 focus:border-[#5A7BFF]/60 ${
              isConfirmPasswordInvalid ? "border-red-500" : "border-purple-200"
            } border`}
          />
          {isConfirmPasswordInvalid && (
            <p className="text-xs text-red-500 mt-1">비밀번호와 비밀번호 확인이 일치하지 않습니다.</p>
          )}

          <input
            name="name"
            placeholder="이름"
            onChange={handleChange}
            className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8F5CFF]/60 focus:border-[#5A7BFF]/60 transition"
          />

          <input
            name="phone"
            placeholder="휴대폰 번호"
            onChange={handleChange}
            className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8F5CFF]/60 focus:border-[#5A7BFF]/60 transition"
          />

          <div>
            <div className="flex gap-3">
              <input
                name="email"
                type="email"
                placeholder="이메일"
                onChange={handleChange}
                className={`flex-1 px-4 py-3 rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-[#8F5CFF]/60 focus:border-[#5A7BFF]/60 ${
                  isEmailInvalid ? "border-red-500" : "border-purple-200"
                }`}
              />
              <Button
                type="button"
                onClick={handleSendVerificationCode}
                disabled={isSendingCode}
                size="sm"
                className="min-w-[120px]"
              >
                {isSendingCode ? "전송 중..." : "인증코드 전송"}
              </Button>
            </div>
          </div>

          <div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="인증 코드 입력"
                value={emailVerificationCode}
                onChange={(e) => setEmailVerificationCode(e.target.value)}
                className={`flex-1 px-4 py-3 rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-[#8F5CFF]/60 focus:border-[#5A7BFF]/60 ${
                  isEmailVerified ? "border-green-500" : "border-purple-200"
                }`}
              />
              <Button
                type="button"
                onClick={handleVerifyCode}
                disabled={isVerifyingCode}
                size="sm"
                className="min-w-[120px]"
              >
                {isVerifyingCode ? "확인 중..." : "인증 확인"}
              </Button>
            </div>
            {emailStatus && (
              <p className={`text-xs mt-1 ${isEmailVerified ? "text-green-600" : "text-gray-600"}`}>
                {emailStatus}
              </p>
            )}
          </div>

          <input
            name="birth"
            type="date"
            onChange={handleChange}
            className="p-3 border rounded-xl"
          />
        </div>

        <Button
          size="md"
          variant="primary"
          className="w-full mt-6"
          onClick={handleRegister}
        >
          회원가입
        </Button>

          <div className="text-center mt-6">
            <span className="text-gray-600">이미 계정이 있으신가요?</span>
            <Link
              to="/login"
              className="ml-1 font-semibold bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent underline-offset-2 hover:underline"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
