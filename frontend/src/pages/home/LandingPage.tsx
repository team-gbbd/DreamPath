import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Briefcase, Users, Send, Sparkles, Sun, Moon, Menu, X, Brain, Zap, Target, Bot, BookOpen, BarChart3 } from "lucide-react";
import FaqChatbot from "@/components/chatbot/FaqChatbot";

// Typing animation hook
function useTypingEffect(text: string, speed: number = 50, startDelay: number = 500) {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText("");
    setIsComplete(false);

    const startTimeout = setTimeout(() => {
      let i = 0;
      const timer = setInterval(() => {
        if (i < text.length) {
          setDisplayText(text.slice(0, i + 1));
          i++;
        } else {
          setIsComplete(true);
          clearInterval(timer);
        }
      }, speed);
      return () => clearInterval(timer);
    }, startDelay);

    return () => clearTimeout(startTimeout);
  }, [text, speed, startDelay]);

  return { displayText, isComplete };
}

// Floating particles component
function FloatingParticles({ darkMode }: { darkMode: boolean }) {
  const particleCount = 60;

  // 고정된 위치값 (렌더링마다 동일)
  const positions = useMemo(() =>
    Array.from({ length: particleCount }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    })), []
  );

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', maxWidth: '100%', overflow: 'hidden', pointerEvents: 'none' }}>
      {positions.map((p, i) => (
          <div
            key={`${i}-${darkMode}`}
            className={`absolute rounded-full ${darkMode ? 'bg-[#5A7BFF]' : 'bg-[#8F5CFF]'}`}
            style={{
              width: darkMode ? 3 : 5,
              height: darkMode ? 3 : 5,
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
    { x: 10, y: 20 }, { x: 25, y: 60 }, { x: 15, y: 80 },
    { x: 85, y: 25 }, { x: 90, y: 70 }, { x: 75, y: 85 },
    { x: 50, y: 10 }, { x: 50, y: 90 },
  ];

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', maxWidth: '100%', overflow: 'hidden', pointerEvents: 'none', opacity: darkMode ? 0.15 : 0.4 }}>
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
            stroke="url(#lineGradient)"
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
          r="4"
          fill="url(#lineGradient)"
          className="animate-pulse-node"
          style={{ animationDelay: `${i * 0.3}s` }}
        />
      ))}
    </svg>
  );
}


export default function LandingPage() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { displayText: typedTitle, isComplete: titleComplete } = useTypingEffect(
    "당신의 꿈을 찾아가는 여정",
    40,
    300
  );

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

  const handleSidebarClick = (type: "home" | "career" | "profile" | "job" | "mentoring" | "learning") => {
    setSidebarOpen(false);

    // 홈은 페이지 새로고침
    if (type === "home") {
      window.location.reload();
      return;
    }

    // 진로 상담은 로그인 필요
    if (type === "career") {
      displayToast("로그인이 필요합니다.");
      setTimeout(() => navigate("/login"), 1500);
      return;
    }

    // 나머지는 프로파일링 필요 메시지
    displayToast("성향 프로파일링이 필요합니다. 진로상담을 먼저 진행해주세요!");
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    displayToast("로그인이 필요합니다.");
    setInputValue("");
    setTimeout(() => navigate("/login"), 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const sidebarItems = [
    { type: "career" as const, icon: MessageSquare, label: "진로 상담" },
    { type: "profile" as const, icon: BarChart3, label: "프로파일링" },
    { type: "job" as const, icon: Briefcase, label: "채용 추천" },
    { type: "mentoring" as const, icon: Users, label: "멘토링" },
    { type: "learning" as const, icon: BookOpen, label: "학습" },
  ];

  const features = [
    { icon: Brain, title: "AI 심층 분석", desc: "성향·감정·가치관 기반 맞춤 분석" },
    { icon: Target, title: "정밀 매칭", desc: "딥러닝 기반 진로·채용 추천" },
    { icon: Zap, title: "실시간 코칭", desc: "전문가 멘토링 & 맞춤 문제 생성" },
  ];

  const theme = {
    bg: darkMode
      ? "bg-[#0a0a0f]"
      : "bg-gradient-to-br from-slate-50 via-white to-slate-100",
    sidebar: darkMode
      ? "bg-white/[0.03] border-white/[0.06] backdrop-blur-xl"
      : "bg-white/80 border-slate-200 shadow-lg backdrop-blur-xl",
    sidebarText: darkMode ? "text-white/60 hover:text-white" : "text-slate-600 hover:text-slate-900",
    sidebarHover: darkMode ? "hover:bg-white/[0.06]" : "hover:bg-slate-100",
    header: darkMode ? "border-white/[0.06] bg-black/20 backdrop-blur-xl" : "border-slate-200 bg-white/80 backdrop-blur-xl",
    headerText: darkMode ? "text-white/60 hover:text-white" : "text-slate-600 hover:text-slate-900",
    title: darkMode ? "text-white" : "text-slate-900",
    subtitle: darkMode ? "text-white/40" : "text-slate-500",
    input: darkMode
      ? "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15] focus-within:border-[#5A7BFF]/50"
      : "bg-white border-slate-200 hover:border-slate-300 shadow-sm focus-within:border-[#5A7BFF]/50",
    inputText: darkMode ? "text-white placeholder-white/25" : "text-slate-900 placeholder-slate-400",
    quickAction: darkMode
      ? "bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] text-white/50 hover:text-white hover:border-[#5A7BFF]/30"
      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900 shadow-sm hover:shadow-md",
    toast: darkMode
      ? "bg-black/80 border-white/10 text-white backdrop-blur-xl"
      : "bg-white border-slate-200 text-slate-900 shadow-2xl backdrop-blur-xl",
    footer: darkMode ? "border-white/[0.06] text-white/20" : "border-slate-200 text-slate-400",
    badge: darkMode ? "bg-white/[0.03] border-white/[0.08] text-white/50" : "bg-white border-slate-200 text-slate-500 shadow-sm",
    mobileOverlay: darkMode ? "bg-black/60 backdrop-blur-sm" : "bg-black/30 backdrop-blur-sm",
    featureCard: darkMode
      ? "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-[#5A7BFF]/30"
      : "bg-white/60 border-slate-200 hover:bg-white hover:shadow-lg",
  };

  return (
    <div className={`min-h-screen ${theme.bg} flex relative overflow-hidden`}>
      {/* Background Effects */}
      <NeuralNetwork darkMode={darkMode} />
      <FloatingParticles darkMode={darkMode} />

      {/* Animated gradient orbs */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', maxWidth: '100%', overflow: 'hidden', pointerEvents: 'none' }}>
        <div
          className={`absolute top-1/4 left-1/4 rounded-full animate-blob ${darkMode ? 'bg-[#5A7BFF]/10' : 'bg-[#5A7BFF]/25'}`}
          style={{ width: 'min(60vw, 600px)', height: 'min(60vw, 600px)', filter: 'blur(120px)' }}
        />
        <div
          className={`absolute bottom-1/4 right-1/4 rounded-full animate-blob animation-delay-2000 ${darkMode ? 'bg-[#8F5CFF]/10' : 'bg-[#8F5CFF]/25'}`}
          style={{ width: 'min(50vw, 500px)', height: 'min(50vw, 500px)', filter: 'blur(120px)' }}
        />
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${darkMode ? 'bg-[#5A7BFF]/[0.05]' : 'bg-[#5A7BFF]/15'}`}
          style={{ width: 'min(80vw, 800px)', height: 'min(60vw, 600px)', filter: 'blur(150px)' }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          pointerEvents: 'none',
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

      {/* Mobile Menu Overlay */}
      {sidebarOpen && (
        <div
          className={`fixed inset-0 z-40 lg:hidden ${theme.mobileOverlay}`}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar - Desktop */}
      <div className={`hidden lg:flex sticky top-0 h-screen w-20 hover:w-64 transition-all duration-300 border-r flex-col py-8 group ${theme.sidebar}`}>
        <div className="px-4 mb-12">
          <div className="w-12 h-12 bg-gradient-to-br from-[#5A7BFF] to-[#8F5CFF] rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 relative overflow-hidden group/logo">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/logo:opacity-100 transition-opacity" />
            <Sparkles className="w-6 h-6 text-white relative z-10" />
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.type}
              onClick={() => handleSidebarClick(item.type)}
              className={`w-full flex items-center gap-4 px-3 py-4 rounded-xl transition-all duration-300 group/nav ${theme.sidebarText} ${theme.sidebarHover}`}
            >
              <div className="relative">
                <item.icon className="w-6 h-6 flex-shrink-0 transition-transform group-hover/nav:scale-110" />
                <div className="absolute -inset-2 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg opacity-0 group-hover/nav:opacity-20 blur transition-opacity" />
              </div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap font-medium text-sm">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="px-3 mt-auto">
          <button
            onClick={() => navigate("/login")}
            className={`w-full flex items-center gap-4 px-3 py-4 rounded-xl transition-all duration-300 ${theme.sidebarText} ${theme.sidebarHover}`}
          >
            <i className="ri-login-box-line text-2xl flex-shrink-0"></i>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap font-medium text-sm">
              로그인
            </span>
          </button>
        </div>
      </div>

      {/* Left Sidebar - Mobile */}
      <div className={`fixed left-0 top-0 h-full w-72 z-50 lg:hidden transform transition-transform duration-300 border-r flex flex-col py-6 ${theme.sidebar} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#5A7BFF] to-[#8F5CFF] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>DreamPath</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className={theme.sidebarText}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.type}
              onClick={() => handleSidebarClick(item.type)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 ${theme.sidebarText} ${theme.sidebarHover}`}
            >
              <item.icon className="w-6 h-6 flex-shrink-0" />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-3">
          <button
            onClick={() => navigate("/login")}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-medium"
          >
            <i className="ri-login-box-line"></i>
            로그인
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`h-16 flex items-center justify-between px-4 md:px-8 border-b relative z-10 ${theme.header}`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`lg:hidden p-2 rounded-lg ${theme.sidebarHover} ${theme.sidebarText}`}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => window.location.reload()}
          >
            <img
              src="https://static.readdy.ai/image/b6e15883c9875312b01889a8e71bf8cf/ccfcaec324d8c4883819f9f330e8ceab.png"
              alt="DreamPath Logo"
              className="h-8 w-8"
            />
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent hidden sm:block">
              DreamPath
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all duration-300 ${theme.sidebarHover} ${theme.sidebarText} hover:rotate-180`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => navigate("/login")}
              className={`px-4 py-2 text-sm transition-colors hidden sm:block ${theme.headerText}`}
            >
              로그인
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-8 -mt-8">
          {/* Welcome Message */}
          <div className="max-w-2xl w-full text-center mb-6 md:mb-8">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6 ${theme.badge} animate-fade-in`}>
              <div className="relative">
                <Sparkles className="w-4 h-4 text-[#8F5CFF]" />
                <div className="absolute inset-0 text-[#8F5CFF] animate-ping">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <span className="text-sm">AI 기반 진로 탐색 플랫폼</span>
            </div>

            <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-4 ${theme.title} min-h-[1.2em]`}>
              {typedTitle}
              {!titleComplete && <span className="animate-blink">|</span>}
            </h2>

            <div className={`overflow-hidden transition-all duration-700 ${titleComplete ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold">
                <span className="bg-gradient-to-r from-[#5A7BFF] via-[#8F5CFF] to-[#5A7BFF] bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent">
                  DreamPath
                </span>
                <span className={theme.title}>와 함께하세요</span>
              </p>
            </div>
          </div>

          {/* Feature Cards */}
          <div className={`grid grid-cols-3 gap-3 md:gap-4 max-w-2xl w-full mb-6 transition-all duration-700 ${titleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {features.map((feature, i) => (
              <div
                key={i}
                className={`relative p-3 md:p-4 rounded-2xl border transition-all duration-300 cursor-default ${theme.featureCard}`}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-[#5A7BFF]/20 to-[#8F5CFF]/20 opacity-0 transition-opacity duration-300 ${hoveredFeature === i ? 'opacity-100' : ''}`} />
                <feature.icon className={`w-6 h-6 md:w-8 md:h-8 mb-2 transition-all duration-300 ${hoveredFeature === i ? 'text-[#5A7BFF] scale-110' : theme.subtitle}`} />
                <h3 className={`text-xs md:text-sm font-semibold mb-1 ${theme.title}`}>{feature.title}</h3>
                <p className={`text-[10px] md:text-xs ${theme.subtitle} hidden sm:block`}>{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className={`max-w-3xl w-full transition-all duration-700 delay-200 ${titleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className={`relative border rounded-2xl transition-all duration-300 ${theme.input} ${darkMode ? 'shadow-[0_0_40px_rgba(90,123,255,0.1)]' : 'shadow-lg'}`}>
              <div className="absolute -inset-[1px] bg-gradient-to-r from-[#5A7BFF]/50 via-[#8F5CFF]/50 to-[#5A7BFF]/50 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 -z-10 blur-sm" />
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="진로에 대해 궁금한 점을 물어보세요..."
                className={`w-full bg-transparent resize-none px-5 py-4 pr-28 focus:outline-none min-h-[56px] max-h-[200px] text-base ${theme.inputText}`}
                rows={1}
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <button
                  onClick={handleSendMessage}
                  className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-xl flex items-center justify-center text-white hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-50 hover:scale-105 relative overflow-hidden group/send"
                  disabled={!inputValue.trim()}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover/send:translate-x-[100%] transition-transform duration-500" />
                  <Send className="w-5 h-5 relative z-10" />
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {["AI 성향분석 시작하기", "맞춤 진로 탐색", "채용 매칭", "1:1 멘토링"].map((text, i) => (
                <button
                  key={text}
                  onClick={() => {
                    setInputValue(text);
                    displayToast("로그인이 필요합니다.");
                    setTimeout(() => navigate("/login"), 1500);
                  }}
                  className={`px-3 sm:px-4 py-2 border rounded-xl text-xs sm:text-sm transition-all duration-300 hover:scale-105 ${theme.quickAction}`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className={`py-6 text-center border-t ${theme.footer}`}>
          <p className="text-sm">© 2025 DreamPath</p>
        </footer>
      </div>

      {/* Floating Chatbot Button */}
      <button
        onClick={() => setChatbotOpen(!chatbotOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white rounded-full shadow-lg shadow-purple-500/30 flex items-center justify-center hover:scale-110 transition-all duration-300 z-50 animate-bounce-slow"
      >
        <Bot size={32} strokeWidth={2} />
      </button>

      {/* Chatbot Overlay */}
      {chatbotOpen && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setChatbotOpen(false)}
        />
      )}

      {/* Chatbot Panel */}
      {chatbotOpen && (
        <div className="fixed z-50 overflow-hidden transform transition-all duration-300 animate-slide-up bottom-4 right-4 left-4 h-[calc(100vh-120px)] sm:bottom-28 sm:right-8 sm:left-auto sm:w-[380px] sm:h-[500px] md:w-[400px] md:h-[550px] bg-white rounded-3xl shadow-2xl border border-gray-200">
          <FaqChatbot onClose={() => setChatbotOpen(false)} />
        </div>
      )}

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

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s step-end infinite;
        }

        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
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

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
