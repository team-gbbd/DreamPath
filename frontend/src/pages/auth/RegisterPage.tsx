import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Sun, Moon, Sparkles, ArrowLeft, Mail, Check } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>/?]/;

const hasSequentialOrRepeatedChars = (value: string) => {
  const normalized = value.toLowerCase();
  for (let i = 0; i < normalized.length - 2; i++) {
    const c1 = normalized.charCodeAt(i);
    const c2 = normalized.charCodeAt(i + 1);
    const c3 = normalized.charCodeAt(i + 2);
    if (c2 === c1 + 1 && c3 === c2 + 1) return true;
    if (normalized[i] === normalized[i + 1] && normalized[i + 1] === normalized[i + 2]) return true;
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
  if (password.length < 8 || password.length > 20) return false;
  let types = 0;
  if (/[a-zA-Z]/.test(password)) types++;
  if (/[0-9]/.test(password)) types++;
  if (SPECIAL_CHAR_REGEX.test(password)) types++;
  if (types < 2) return false;
  if (hasSequentialOrRepeatedChars(password)) return false;
  if (username && username.length > 0 && password.toLowerCase().includes(username.toLowerCase())) return false;
  return true;
};

// Floating particles component
function FloatingParticles({ darkMode }: { darkMode: boolean }) {
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    size: Math.random() * 3 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-full ${darkMode ? 'bg-[#5A7BFF]' : 'bg-[#8F5CFF]'}`}
          style={{
            width: darkMode ? p.size : p.size + 2,
            height: darkMode ? p.size : p.size + 2,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: darkMode ? 0.3 : 0.5,
            animation: `float-particle ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// Neural network lines
function NeuralNetwork({ darkMode }: { darkMode: boolean }) {
  const nodes = [
    { x: 5, y: 15 }, { x: 15, y: 50 }, { x: 10, y: 85 },
    { x: 90, y: 20 }, { x: 95, y: 65 }, { x: 85, y: 90 },
  ];

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: darkMode ? 0.12 : 0.4 }}>
      <defs>
        <linearGradient id="lineGradientRegister" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5A7BFF" />
          <stop offset="100%" stopColor="#8F5CFF" />
        </linearGradient>
      </defs>
      {nodes.map((node, i) =>
        nodes.slice(i + 1).map((target, j) => (
          <line
            key={`${i}-${j}`}
            x1={`${node.x}%`}
            y1={`${node.y}%`}
            x2={`${target.x}%`}
            y2={`${target.y}%`}
            stroke="url(#lineGradientRegister)"
            strokeWidth="1"
            className="animate-pulse-slow"
          />
        ))
      )}
      {nodes.map((node, i) => (
        <circle
          key={i}
          cx={`${node.x}%`}
          cy={`${node.y}%`}
          r="3"
          fill="url(#lineGradientRegister)"
          className="animate-pulse-node"
          style={{ animationDelay: `${i * 0.3}s` }}
        />
      ))}
    </svg>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dreampath:theme") === "dark";
    }
    return false;
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
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
    const savedTheme = localStorage.getItem("dreampath:theme");
    if (savedTheme) {
      setDarkMode(savedTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("dreampath:theme", newMode ? "dark" : "light");
  };

  const displayToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

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
      displayToast("이메일을 입력해주세요.");
      return;
    }
    if (isEmailInvalid) {
      displayToast("올바른 이메일 형식을 입력해주세요.");
      return;
    }
    try {
      setIsSendingCode(true);
      await axios.post(`${API_BASE_URL}/auth/email/send`, { email: form.email });
      setEmailStatus("인증 코드가 발송되었습니다.");
      displayToast("인증 코드가 발송되었습니다. 이메일을 확인해주세요.");
      setIsEmailVerified(false);
    } catch (err) {
      displayToast(resolveErrorMessage(err, "인증 코드 발송에 실패했습니다."));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!form.email || !emailVerificationCode) {
      displayToast("이메일과 인증 코드를 모두 입력해주세요.");
      return;
    }
    try {
      setIsVerifyingCode(true);
      await axios.post(`${API_BASE_URL}/auth/email/verify`, {
        email: form.email,
        code: emailVerificationCode,
      });
      setIsEmailVerified(true);
      setEmailStatus("이메일 인증 완료");
      displayToast("이메일 인증이 완료되었습니다!");
    } catch (err) {
      setIsEmailVerified(false);
      setEmailStatus("");
      displayToast(resolveErrorMessage(err, "인증 코드 확인에 실패했습니다."));
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleRegister = async () => {
    if (form.password !== form.confirmPassword) {
      displayToast("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    const requiredFields: Array<keyof typeof form> = ["username", "password", "name", "phone", "birth", "email"];
    const hasEmptyRequired = requiredFields.some((key) => !form[key]);
    if (hasEmptyRequired) {
      displayToast("모든 필수 항목을 입력해주세요.");
      return;
    }

    if (!isEmailVerified) {
      displayToast("이메일 인증을 완료해주세요.");
      return;
    }

    try {
      const { confirmPassword, ...payload } = form;
      await axios.post(`${API_BASE_URL}/auth/register`, payload);
      displayToast("회원가입이 완료되었습니다!");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      displayToast(resolveErrorMessage(err, "회원가입에 실패했습니다."));
    }
  };

  const theme = {
    bg: darkMode ? "bg-[#0a0a0f]" : "bg-gradient-to-br from-slate-50 via-white to-slate-100",
    card: darkMode
      ? "bg-white/[0.03] border-white/[0.08] backdrop-blur-xl"
      : "bg-white/80 border-slate-200 shadow-2xl backdrop-blur-xl",
    title: darkMode ? "text-white" : "text-slate-900",
    subtitle: darkMode ? "text-white/50" : "text-slate-500",
    input: darkMode
      ? "bg-white/[0.05] border-white/[0.1] text-white placeholder-white/30 focus:border-[#5A7BFF]/50"
      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#5A7BFF]/50",
    inputError: darkMode
      ? "bg-white/[0.05] border-red-500/50 text-white placeholder-white/30"
      : "bg-white border-red-400 text-slate-900 placeholder-slate-400",
    inputSuccess: darkMode
      ? "bg-white/[0.05] border-green-500/50 text-white placeholder-white/30"
      : "bg-white border-green-400 text-slate-900 placeholder-slate-400",
    label: darkMode ? "text-white/70" : "text-slate-700",
    hint: darkMode ? "text-white/40" : "text-slate-400",
    hintError: "text-red-400",
    hintSuccess: "text-green-400",
    toast: darkMode
      ? "bg-black/80 border-white/10 text-white backdrop-blur-xl"
      : "bg-white border-slate-200 text-slate-900 shadow-2xl backdrop-blur-xl",
    iconBtn: darkMode ? "text-white/60 hover:text-white hover:bg-white/[0.06]" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
    secondaryBtn: darkMode
      ? "bg-white/[0.08] text-white/80 hover:bg-white/[0.12] border-white/[0.1]"
      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
  };

  return (
    <div className={`min-h-screen ${theme.bg} flex items-center justify-center relative overflow-hidden py-8`}>
      {/* Background Effects */}
      <NeuralNetwork darkMode={darkMode} />
      <FloatingParticles darkMode={darkMode} />

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] animate-blob ${darkMode ? 'bg-[#5A7BFF]/10' : 'bg-[#5A7BFF]/25'}`} />
        <div className={`absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] animate-blob animation-delay-2000 ${darkMode ? 'bg-[#8F5CFF]/10' : 'bg-[#8F5CFF]/25'}`} />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)'
            : 'linear-gradient(rgba(90,123,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(90,123,255,0.08) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-slide-down">
          <div className={`border rounded-2xl px-6 py-4 shadow-2xl ${theme.toast}`}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] animate-pulse" />
              <p className="font-medium">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <div className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 md:px-8 z-20">
        <button
          onClick={() => navigate("/")}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${theme.iconBtn}`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline text-sm font-medium">홈으로</span>
        </button>

        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl transition-all duration-300 ${theme.iconBtn} hover:rotate-180`}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Register Card */}
      <div className={`relative w-full max-w-lg mx-4 border rounded-3xl p-6 md:p-8 mt-8 ${theme.card}`}>
        {/* Gradient border effect */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-[#5A7BFF]/30 via-[#8F5CFF]/30 to-[#5A7BFF]/30 rounded-3xl -z-10 blur-sm opacity-50" />

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#5A7BFF] to-[#8F5CFF] rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-1">
          <span className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">
            회원가입
          </span>
        </h2>
        <p className={`text-center mb-6 text-sm ${theme.subtitle}`}>
          DreamPath와 함께 새로운 여정을 시작하세요
        </p>

        {/* Form */}
        <div className="space-y-3">
          {/* Username */}
          <div>
            <input
              name="username"
              placeholder="아이디"
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/30 ${
                isUsernameInvalid ? theme.inputError : theme.input
              }`}
            />
            <p className={`text-xs mt-1 ${isUsernameInvalid ? theme.hintError : theme.hint}`}>
              6~20자의 영문과 숫자 조합
            </p>
          </div>

          {/* Password */}
          <div>
            <input
              name="password"
              type="password"
              placeholder="비밀번호"
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/30 ${
                isPasswordInvalid ? theme.inputError : theme.input
              }`}
            />
            <p className={`text-xs mt-1 ${isPasswordInvalid ? theme.hintError : theme.hint}`}>
              8~20자, 영문/숫자/특수문자 중 2가지 이상 조합
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <input
              name="confirmPassword"
              type="password"
              placeholder="비밀번호 확인"
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/30 ${
                isConfirmPasswordInvalid ? theme.inputError : theme.input
              }`}
            />
            {isConfirmPasswordInvalid && (
              <p className={`text-xs mt-1 ${theme.hintError}`}>비밀번호가 일치하지 않습니다</p>
            )}
          </div>

          {/* Name */}
          <input
            name="name"
            placeholder="이름"
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/30 ${theme.input}`}
          />

          {/* Phone */}
          <input
            name="phone"
            placeholder="휴대폰 번호"
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/30 ${theme.input}`}
          />

          {/* Email with verification */}
          <div>
            <div className="flex gap-2">
              <input
                name="email"
                type="email"
                placeholder="이메일"
                onChange={handleChange}
                className={`flex-1 px-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/30 ${
                  isEmailInvalid ? theme.inputError : isEmailVerified ? theme.inputSuccess : theme.input
                }`}
              />
              <button
                type="button"
                onClick={handleSendVerificationCode}
                disabled={isSendingCode}
                className={`px-4 py-3 rounded-xl border font-medium text-sm transition-all duration-300 disabled:opacity-50 flex items-center gap-2 ${theme.secondaryBtn}`}
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">{isSendingCode ? "전송중" : "인증"}</span>
              </button>
            </div>
          </div>

          {/* Verification Code */}
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="인증 코드 입력"
                value={emailVerificationCode}
                onChange={(e) => setEmailVerificationCode(e.target.value)}
                className={`flex-1 px-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/30 ${
                  isEmailVerified ? theme.inputSuccess : theme.input
                }`}
              />
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={isVerifyingCode || isEmailVerified}
                className={`px-4 py-3 rounded-xl border font-medium text-sm transition-all duration-300 disabled:opacity-50 flex items-center gap-2 ${
                  isEmailVerified
                    ? 'bg-green-500/20 border-green-500/30 text-green-400'
                    : theme.secondaryBtn
                }`}
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">{isEmailVerified ? "완료" : "확인"}</span>
              </button>
            </div>
            {emailStatus && (
              <p className={`text-xs mt-1 ${isEmailVerified ? theme.hintSuccess : theme.hint}`}>
                {emailStatus}
              </p>
            )}
          </div>

          {/* Birth */}
          <div>
            <label className={`block mb-1 text-xs ${theme.hint}`}>생년월일</label>
            <input
              name="birth"
              type="date"
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/30 ${theme.input}`}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleRegister}
          className="w-full py-3 mt-6 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <span className="relative z-10">회원가입</span>
        </button>

        {/* Login Link */}
        <div className="text-center mt-5">
          <span className={theme.subtitle}>이미 계정이 있으신가요? </span>
          <Link
            to="/login"
            className="font-semibold bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent hover:underline underline-offset-2"
          >
            로그인
          </Link>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(30px, 10px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 20s ease-in-out infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }

        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-20px) translateX(10px); opacity: 0.5; }
          50% { transform: translateY(-10px) translateX(-10px); opacity: 0.3; }
          75% { transform: translateY(-30px) translateX(5px); opacity: 0.4; }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        @keyframes pulse-node {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        .animate-pulse-node {
          animation: pulse-node 3s ease-in-out infinite;
        }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: ${darkMode ? 'invert(1)' : 'none'};
        }
      `}</style>
    </div>
  );
}