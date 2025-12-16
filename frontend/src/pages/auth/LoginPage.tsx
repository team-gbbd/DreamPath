import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { Sun, Moon, Sparkles, ArrowLeft } from "lucide-react";
import { API_BASE_URL, BACKEND_BASE_URL } from "@/lib/api";

const resolveErrorMessage = (err: any, fallback: string) => {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  if (data && typeof data.message === "string") return data.message;
  if (err?.message) return err.message;
  return fallback;
};

let lastProcessedSocialQuery: string | null = null;

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
        <linearGradient id="lineGradientLogin" x1="0%" y1="0%" x2="100%" y2="100%">
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
            stroke="url(#lineGradientLogin)"
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
          fill="url(#lineGradientLogin)"
          className="animate-pulse-node"
          style={{ animationDelay: `${i * 0.3}s` }}
        />
      ))}
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dreampath:theme") === "dark";
    }
    return false;
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

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
    const search = location.search || "";
    if (!search) {
      lastProcessedSocialQuery = null;
      return;
    }

    if (lastProcessedSocialQuery === search) {
      return;
    }

    lastProcessedSocialQuery = search;
    const params = new URLSearchParams(search);
    const status = params.get("social");
    if (!status) return;

    if (status === "success") {
      const userPayload = params.get("user");
      if (userPayload) {
        try {
          const normalized = userPayload.replace(/-/g, "+").replace(/_/g, "/");
          const padding = 4 - (normalized.length % 4);
          const padded = normalized + "=".repeat(padding === 4 ? 0 : padding);
          const binary = atob(padded);
          const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
          const decoded = new TextDecoder().decode(bytes);
          const user = JSON.parse(decoded);
          // 민감 정보 제외하고 필수 정보만 저장
          const safeUser = {
            userId: user.userId,
            username: user.username,
            name: user.name,
            email: user.email,
            phone: user.phone,
            birth: user.birth,
            createdAt: user.createdAt,
            role: user.role,
            accessToken: user.accessToken
          };
          localStorage.setItem("dreampath:user", JSON.stringify(safeUser));
          window.dispatchEvent(new Event("dreampath-auth-change"));
          displayToast(`${user.name}님 환영합니다!`);
          setTimeout(() => navigate("/", { replace: true }), 1500);
          return;
        } catch (error) {
          displayToast("소셜 로그인 정보를 처리하는 중 오류가 발생했습니다.");
        }
      }
      navigate("/login", { replace: true });
    } else if (status === "error") {
      const message = params.get("message") || "소셜 로그인에 실패했습니다.";
      displayToast(message);
      navigate("/login", { replace: true });
    }
  }, [location.search, navigate]);

  const handleLogin = async () => {
    if (!username || !password) {
      displayToast("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
      // 민감 정보 제외하고 필수 정보만 저장
      const safeUser = {
        userId: res.data.userId,
        username: res.data.username,
        name: res.data.name,
        email: res.data.email,
        phone: res.data.phone,
        birth: res.data.birth,
        createdAt: res.data.createdAt,
        role: res.data.role,
        accessToken: res.data.accessToken
      };
      localStorage.setItem("dreampath:user", JSON.stringify(safeUser));
      window.dispatchEvent(new Event("dreampath-auth-change"));
      displayToast(`${res.data.name}님 환영합니다!`);
      setTimeout(() => navigate("/", { replace: true }), 1500);
    } catch (err) {
      displayToast(resolveErrorMessage(err, "로그인에 실패했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: "google" | "kakao" | "naver") => {
    window.location.href = `${BACKEND_BASE_URL}/oauth2/authorization/${provider}`;
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
    label: darkMode ? "text-white/70" : "text-slate-700",
    link: darkMode ? "text-white/50 hover:text-white" : "text-slate-500 hover:text-slate-900",
    socialBtn: darkMode
      ? "bg-white/[0.05] border-white/[0.1] hover:bg-white/[0.1]"
      : "bg-white border-slate-200 hover:bg-slate-50 shadow-sm",
    toast: darkMode
      ? "bg-black/80 border-white/10 text-white backdrop-blur-xl"
      : "bg-white border-slate-200 text-slate-900 shadow-2xl backdrop-blur-xl",
    iconBtn: darkMode ? "text-white/60 hover:text-white hover:bg-white/[0.06]" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
  };

  return (
    <div className={`min-h-screen ${theme.bg} flex items-center justify-center relative overflow-hidden`}>
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

      {/* Login Card */}
      <div className={`relative w-full max-w-md mx-4 border rounded-3xl p-8 ${theme.card}`}>
        {/* Gradient border effect */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-[#5A7BFF]/30 via-[#8F5CFF]/30 to-[#5A7BFF]/30 rounded-3xl -z-10 blur-sm opacity-50" />

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-[#5A7BFF] to-[#8F5CFF] rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-center mb-2">
          <span className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">
            로그인
          </span>
        </h2>
        <p className={`text-center mb-8 text-sm ${theme.subtitle}`}>
          DreamPath와 함께 꿈을 향한 여정을 시작하세요
        </p>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className={`block mb-2 text-sm font-medium ${theme.label}`}>아이디</label>
            <input
              type="text"
              className={`w-full px-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/30 ${theme.input}`}
              placeholder="아이디를 입력하세요"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
              }}
            />
          </div>

          <div>
            <label className={`block mb-2 text-sm font-medium ${theme.label}`}>비밀번호</label>
            <input
              type="password"
              className={`w-full px-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/30 ${theme.input}`}
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
              }}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-50 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <span className="relative z-10">{isSubmitting ? "로그인 중..." : "로그인"}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className={`flex-1 h-px ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
          <span className={`text-xs ${theme.subtitle}`}>또는</span>
          <div className={`flex-1 h-px ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
        </div>

        {/* Social Login */}
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => handleSocialLogin("naver")}
            className="w-12 h-12 rounded-xl bg-[#03C75A] flex items-center justify-center hover:scale-105 transition-all duration-300 shadow-lg shadow-green-500/20"
            title="네이버로 로그인"
          >
            <span className="text-white text-xl font-black">N</span>
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin("kakao")}
            className="w-12 h-12 rounded-xl bg-[#FEE500] flex items-center justify-center hover:scale-105 transition-all duration-300 shadow-lg shadow-yellow-500/20"
            title="카카오로 로그인"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#000000" aria-hidden="true">
              <path d="M12 3C6.477 3 2 6.477 2 10.75c0 2.89 2.049 5.407 5.034 6.799l-.827 3.005c-.073.266.227.485.46.335l3.823-2.456c.496.07 1.005.107 1.51.107 5.523 0 10-3.477 10-7.75S17.523 3 12 3z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin("google")}
            className={`w-12 h-12 rounded-xl flex items-center justify-center hover:scale-105 transition-all duration-300 ${theme.socialBtn}`}
            title="Google로 로그인"
          >
            <svg className="w-6 h-6" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 20.2h18.4c.3 1.05.6 2.1.6 3.4 0 11.2-7.5 19.1-19 19.1A20 20 0 0 1 5 23.5 20 20 0 0 1 24 4c5.4 0 9.9 2.1 13 5.5l-5.3 5.1c-1.3-1.3-3.6-2.8-7.7-2.8a11 11 0 0 0 0 22c5.4 0 7.4-3.1 7.9-5.9H24Z" />
              <path fill="#4285F4" d="M43 23.6A20 20 0 0 1 24 43v-8A11 11 0 0 0 35.1 29H24v-8h19Z" />
              <path fill="#34A853" d="M24 43a20 20 0 0 1-19-19H13a11 11 0 0 0 11 11v8Z" />
              <path fill="#FBBC05" d="M5 24a20 20 0 0 1 19-19v8a11 11 0 0 0-11 11H5Z" />
            </svg>
          </button>
        </div>

        {/* Register Link */}
        <div className="text-center mt-6">
          <span className={theme.subtitle}>아직 계정이 없으신가요? </span>
          <Link
            to="/register"
            className="font-semibold bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent hover:underline underline-offset-2"
          >
            회원가입
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
      `}</style>
    </div>
  );
}
