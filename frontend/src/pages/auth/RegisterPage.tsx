import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

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
      await axios.post("http://localhost:8080/api/auth/email/send", { email: form.email });
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
      await axios.post("http://localhost:8080/api/auth/email/verify", {
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
      await axios.post("http://localhost:8080/api/auth/register", payload);
      alert("회원가입이 완료되었습니다!");
      setTimeout(() => navigate("/login", { replace: true }), 0);
    } catch (err: any) {
      alert(resolveErrorMessage(err, "회원가입 실패"));
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100">
      <div className="w-full max-w-lg bg-white/80 backdrop-blur-xl shadow-xl rounded-2xl p-10">

        <h2 className="text-3xl font-bold text-center text-purple-600 mb-8">
          회원가입
        </h2>
        <div className="grid grid-cols-1 gap-4">
          <input
            name="username"
            placeholder="아이디"
            onChange={handleChange}
            className={`p-3 border rounded-xl ${isUsernameInvalid ? "border-red-500" : "border-gray-300"}`}
          />
          <p className={`text-xs mt-1 ${isUsernameInvalid ? "text-red-500" : "text-gray-600"}`}>
            아이디는 6~20자의 영문과 숫자 조합만 가능합니다. (특수문자/공백 불가)
          </p>

          <input
            name="password"
            type="password"
            placeholder="비밀번호"
            onChange={handleChange}
            className={`p-3 border rounded-xl ${isPasswordInvalid ? "border-red-500" : "border-gray-300"}`}
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
            className={`p-3 border rounded-xl ${isConfirmPasswordInvalid ? "border-red-500" : "border-gray-300"}`}
          />
          {isConfirmPasswordInvalid && (
            <p className="text-xs text-red-500 mt-1">비밀번호와 비밀번호 확인이 일치하지 않습니다.</p>
          )}

          <input
            name="name"
            placeholder="이름"
            onChange={handleChange}
            className="p-3 border rounded-xl"
          />

          <input
            name="phone"
            placeholder="휴대폰 번호"
            onChange={handleChange}
            className="p-3 border rounded-xl"
          />

          <div>
            <div className="flex gap-3">
              <input
                name="email"
                type="email"
                placeholder="이메일"
                onChange={handleChange}
                className={`flex-1 p-3 border rounded-xl ${isEmailInvalid ? "border-red-500" : "border-gray-300"}`}
              />
              <button
                type="button"
                onClick={handleSendVerificationCode}
                disabled={isSendingCode}
                className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-60"
              >
                {isSendingCode ? "전송 중..." : "인증코드 전송"}
              </button>
            </div>
            <p className={`text-xs mt-1 ${isEmailInvalid ? "text-red-500" : "text-gray-600"}`}>
              이메일 입력 후 인증 코드를 발송해주세요.
            </p>
          </div>

          <div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="인증 코드 입력"
                value={emailVerificationCode}
                onChange={(e) => setEmailVerificationCode(e.target.value)}
                className={`flex-1 p-3 border rounded-xl ${
                  isEmailVerified ? "border-green-500" : "border-gray-300"
                }`}
              />
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={isVerifyingCode}
                className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-60"
              >
                {isVerifyingCode ? "확인 중..." : "인증 확인"}
              </button>
            </div>
            <p className={`text-xs mt-1 ${isEmailVerified ? "text-green-600" : "text-gray-600"}`}>
              {emailStatus || "이메일로 받은 인증 코드를 입력하고 확인을 눌러주세요."}
            </p>
          </div>

          <input
            name="birth"
            type="date"
            onChange={handleChange}
            className="p-3 border rounded-xl"
          />
        </div>

        <button
          onClick={handleRegister}
          className="w-full mt-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
        >
          회원가입
        </button>

        <div className="text-center mt-6">
          <span className="text-gray-600">이미 계정이 있으신가요?</span>
          <Link to="/login" className="text-purple-600 font-semibold ml-1">
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
