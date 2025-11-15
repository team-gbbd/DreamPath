import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";

const resolveErrorMessage = (err: any, fallback: string) => {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  if (data && typeof data.message === "string") return data.message;
  if (err?.message) return err.message;
  return fallback;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("social");
    if (!status) return;

    if (status === "success") {
      const userPayload = params.get("user");
      if (userPayload) {
        try {
          const normalized = userPayload.replace(/-/g, "+").replace(/_/g, "/");
          const padding = 4 - (normalized.length % 4);
          const padded = normalized + "=".repeat(padding === 4 ? 0 : padding);
          const decoded = atob(padded);
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
    } catch (err: any) {
      alert(resolveErrorMessage(err, "로그인에 실패했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: "google" | "kakao" | "naver") => {
    window.location.href = `http://localhost:8080/oauth2/authorization/${provider}`;
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 relative">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl shadow-xl rounded-2xl p-8 relative z-10">
        <h2 className="text-3xl font-bold text-center text-purple-600 mb-6">로그인</h2>

        <div className="mb-4">
          <label className="block mb-1 font-medium">아이디</label>
          <input
            type="text"
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
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
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition disabled:opacity-60"
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => handleSocialLogin("kakao")}
            className="w-full py-3 rounded-xl font-semibold bg-[#FEE500] text-gray-900 hover:opacity-90 transition"
          >
            카카오로 계속하기
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin("google")}
            className="w-full py-3 rounded-xl font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition"
          >
            Google 계정으로 계속하기
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin("naver")}
            className="w-full py-3 rounded-xl font-semibold bg-[#03C75A] text-white hover:opacity-90 transition"
          >
            네이버로 계속하기
          </button>
        </div>

        <div className="text-center mt-6">
          <span className="text-gray-600">아직 계정이 없으신가요?</span>
          <Link to="/register" className="text-purple-600 font-semibold ml-1 underline-offset-2 hover:underline">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}
