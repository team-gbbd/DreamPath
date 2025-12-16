import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dreampath:theme") === "dark";
    }
    return false;
  });

  // Theme 객체
  const theme = {
    bg: darkMode ? "bg-[#0B0D14]" : "bg-gradient-to-br from-slate-50 via-white to-slate-100",
    text: darkMode ? "text-white" : "text-slate-900",
    textMuted: darkMode ? "text-white/60" : "text-slate-600",
    textSubtle: darkMode ? "text-white/40" : "text-slate-500",
  };

  useEffect(() => {
    // 테마 로드
    const savedTheme = localStorage.getItem('dreampath:theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    }

    // 테마 변경 이벤트 리스너
    const handleThemeChange = () => {
      const t = localStorage.getItem('dreampath:theme');
      setDarkMode(t === 'dark');
    };

    window.addEventListener('dreampath-theme-change', handleThemeChange);
    return () => window.removeEventListener('dreampath-theme-change', handleThemeChange);
  }, []);

  return (
    <div className={`min-h-screen ${theme.bg} relative overflow-hidden`}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-[#5A7BFF]/10" : "bg-[#5A7BFF]/20"}`} />
        <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-[#8F5CFF]/10" : "bg-[#8F5CFF]/20"}`} />
      </div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
            : "linear-gradient(rgba(90,123,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(90,123,255,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 relative z-10">
        {/* 404 Icon */}
        <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-6 ${
          darkMode ? 'bg-[#5A7BFF]/20' : 'bg-[#5A7BFF]/10'
        }`}>
          <i className={`ri-error-warning-line text-4xl sm:text-5xl ${darkMode ? 'text-[#5A7BFF]' : 'text-[#5A7BFF]'}`}></i>
        </div>

        {/* 404 Number */}
        <h1 className="text-7xl sm:text-8xl lg:text-9xl font-bold bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent mb-4">
          404
        </h1>

        {/* Title */}
        <h2 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${theme.text} mb-3`}>
          페이지를 찾을 수 없습니다
        </h2>

        {/* Description */}
        <p className={`text-sm sm:text-base lg:text-lg ${theme.textMuted} mb-8 max-w-md`}>
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-md">
          <button
            onClick={() => navigate('/')}
            className="flex-1 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white py-3 px-6 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/30 transition-all text-sm sm:text-base"
          >
            <i className="ri-home-line mr-2"></i>
            홈으로 가기
          </button>

          <button
            onClick={() => navigate(-1)}
            className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all text-sm sm:text-base border-2 ${
              darkMode
                ? 'border-white/20 text-white/80 hover:bg-white/[0.05]'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <i className="ri-arrow-left-line mr-2"></i>
            이전으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}