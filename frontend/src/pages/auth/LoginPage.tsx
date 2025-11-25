import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import Button from "../../components/base/Button";
import Header from "../../components/feature/Header";

const resolveErrorMessage = (err: any, fallback: string) => {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  if (data && typeof data.message === "string") return data.message;
  if (err?.message) return err.message;
  return fallback;
};

let lastProcessedSocialQuery: string | null = null;
const heroBackgroundImage =
  "https://readdy.ai/api/search-image?query=Modern%20professional%20woman%20using%20AI%20technology%20for%20career%20guidance%2C%20futuristic%20interface%20with%20holographic%20career%20paths%2C%20soft%20blue%20and%20purple%20lighting%2C%20minimalist%20background%2C%20digital%20innovation%20concept%2C%20clean%20and%20inspiring%20atmosphere&width=800&height=1000&seq=hero-dreampath&orientation=portrait";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          localStorage.setItem("dreampath:user", JSON.stringify(user));
          window.dispatchEvent(new Event("dreampath-auth-change"));
          alert(`${user.name}님 환영합니다!`);
          navigate("/", { replace: true });
          return;
        } catch (error) {
          alert("소셜 로그인 정보를 처리하는 중 오류가 발생했습니다.");
        }
      }
      navigate("/login", { replace: true });
    } else if (status === "error") {
      const message = params.get("message") || "소셜 로그인에 실패했습니다.";
      alert(message);
      navigate("/login", { replace: true });
    }
  }, [location.search, navigate]);

  const handleLogin = async () => {
    if (!username || !password) {
      alert("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await axios.post("http://localhost:8080/api/auth/login", { username, password });
      localStorage.setItem("dreampath:user", JSON.stringify(res.data));
      window.dispatchEvent(new Event("dreampath-auth-change"));
      alert(`${res.data.name}님 환영합니다!`);
      navigate("/", { replace: true });
    } catch (err) {
      alert(resolveErrorMessage(err, "로그인에 실패했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: "google" | "kakao" | "naver") => {
    window.location.href = `http://localhost:8080/oauth2/authorization/${provider}`;
  };

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
        <div className="w-full max-w-md bg-white/85 backdrop-blur-2xl shadow-2xl rounded-2xl p-8">
        <h2 className="text-4xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">
            로그인
          </span>
        </h2>

        <div className="mb-4">
          <label className="block mb-1 font-medium">아이디</label>
          <input
            type="text"
            className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8F5CFF]/60 focus:border-[#5A7BFF]/60 transition"
            placeholder="아이디를 입력하세요"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
          />
        </div>

        <div className="mb-6">
          <label className="block mb-1 font-medium">비밀번호</label>
          <input
            type="password"
            className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8F5CFF]/60 focus:border-[#5A7BFF]/60 transition"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
          />
        </div>

        <Button
          size="md"
          variant="primary"
          onClick={handleLogin}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "로그인 중..." : "로그인하기"}
        </Button>

        <div className="mt-8">
          <p className="text-center text-gray-600 font-medium mb-4">소셜 계정으로 로그인</p>
          <div className="flex justify-center gap-4 mt-6">
            <button
              type="button"
              onClick={() => handleSocialLogin("naver")}
              className="w-14 h-14 rounded-full bg-[#03C75A] flex items-center justify-center hover:opacity-90 transition shadow-md"
              title="네이버로 로그인"
            >
              <span className="text-white text-2xl font-black tracking-tight">N</span>
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin("kakao")}
              className="w-14 h-14 rounded-full bg-[#FEE500] flex items-center justify-center hover:opacity-90 transition shadow-md"
              title="카카오로 로그인"
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#000000" aria-hidden="true">
                <path d="M12 3C6.477 3 2 6.477 2 10.75c0 2.89 2.049 5.407 5.034 6.799l-.827 3.005c-.073.266.227.485.46.335l3.823-2.456c.496.07 1.005.107 1.51.107 5.523 0 10-3.477 10-7.75S17.523 3 12 3z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin("google")}
              className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:opacity-90 transition shadow-md"
              title="Google로 로그인"
            >
              <svg className="w-7 h-7" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 20.2h18.4c.3 1.05.6 2.1.6 3.4 0 11.2-7.5 19.1-19 19.1A20 20 0 0 1 5 23.5 20 20 0 0 1 24 4c5.4 0 9.9 2.1 13 5.5l-5.3 5.1c-1.3-1.3-3.6-2.8-7.7-2.8a11 11 0 0 0 0 22c5.4 0 7.4-3.1 7.9-5.9H24Z" />
                <path fill="#4285F4" d="M43 23.6A20 20 0 0 1 24 43v-8A11 11 0 0 0 35.1 29H24v-8h19Z" />
                <path fill="#34A853" d="M24 43a20 20 0 0 1-19-19H13a11 11 0 0 0 11 11v8Z" />
                <path fill="#FBBC05" d="M5 24a20 20 0 0 1 19-19v8a11 11 0 0 0-11 11H5Z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <span className="text-gray-600">아직 계정이 없으신가요?</span>
          <Link
            to="/register"
            className="ml-1 font-semibold bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent underline-offset-2 hover:underline"
          >
            회원가입
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
