import { useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MessageSquare,
  Briefcase,
  Users,
  Sparkles,
  Sun,
  Moon,
  Menu,
  X,
  Bot,
  LogOut,
  User,
  BookOpen,
  Home,
} from "lucide-react";
import FaqChatbot from "@/components/chatbot/FaqChatbot";

interface MainLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

export default function MainLayout({ children, showFooter = true }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("dreampath:theme");
    if (savedTheme) {
      setDarkMode(savedTheme === "dark");
    }

    const syncUser = () => {
      const userStr = localStorage.getItem("dreampath:user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setUserName(user.name || "");
          setUserRole(user.role || "");
          setIsLoggedIn(true);
        } catch (e) {
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
        setUserName("");
        setUserRole("");
      }
    };

    syncUser();
    window.addEventListener("dreampath-auth-change", syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener("dreampath-auth-change", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("dreampath:theme", newMode ? "dark" : "light");
    window.dispatchEvent(new Event("dreampath-theme-change"));
  };

  const handleLogout = () => {
    localStorage.removeItem("dreampath:user");
    sessionStorage.removeItem("assistant_chatbot_session_id");
    sessionStorage.removeItem("assistant_chatbot_messages");
    sessionStorage.removeItem("chatbot_session_id");
    sessionStorage.removeItem("chatbot_messages");
    sessionStorage.removeItem("faq_chatbot_session_id");
    sessionStorage.removeItem("faq_chatbot_messages");
    localStorage.setItem("assistant_chatbot_last_user_id", "null");
    localStorage.setItem("chatbot_last_user_id", "null");
    localStorage.setItem("faq_chatbot_last_user_id", "null");
    window.dispatchEvent(new Event("dreampath-auth-change"));
    navigate("/");
  };

  const handleLogoClick = () => {
    if (location.pathname === "/" || location.pathname === "/home") {
      window.location.reload();
    } else {
      navigate("/home");
    }
  };

  const handleSidebarClick = (type: string) => {
    setSidebarOpen(false);
    switch (type) {
      case "home":
        navigate("/home");
        break;
      case "career":
        navigate("/career-chat");
        break;
      case "job":
        navigate("/job-recommendations");
        break;
      case "learning":
        navigate("/learning");
        break;
      case "mentoring":
        navigate("/mentoring");
        break;
      default:
        break;
    }
  };

  const sidebarItems = [
    { type: "home", icon: Home, label: "홈" },
    { type: "career", icon: MessageSquare, label: "진로 상담" },
    { type: "job", icon: Briefcase, label: "채용 추천" },
    { type: "mentoring", icon: Users, label: "멘토링" },
    { type: "learning", icon: BookOpen, label: "학습" },
  ];

  const theme = {
    bg: darkMode
      ? "bg-[#0a0a0f]"
      : "bg-gradient-to-br from-slate-50 via-white to-slate-100",
    sidebar: darkMode
      ? "bg-white/[0.03] border-white/[0.06] backdrop-blur-xl"
      : "bg-white/80 border-slate-200 shadow-lg backdrop-blur-xl",
    sidebarText: darkMode
      ? "text-white/60 hover:text-white"
      : "text-slate-600 hover:text-slate-900",
    sidebarHover: darkMode ? "hover:bg-white/[0.06]" : "hover:bg-slate-100",
    header: darkMode
      ? "border-white/[0.06] bg-black/20 backdrop-blur-xl"
      : "border-slate-200 bg-white/80 backdrop-blur-xl",
    headerText: darkMode
      ? "text-white/60 hover:text-white"
      : "text-slate-600 hover:text-slate-900",
    title: darkMode ? "text-white" : "text-slate-900",
    footer: darkMode
      ? "border-white/[0.06] text-white/20"
      : "border-slate-200 text-slate-400",
    mobileOverlay: darkMode
      ? "bg-black/60 backdrop-blur-sm"
      : "bg-black/30 backdrop-blur-sm",
  };

  return (
    <div className={`min-h-screen ${theme.bg} flex relative`}>
      {/* Mobile Menu Overlay */}
      {sidebarOpen && (
        <div
          className={`fixed inset-0 z-40 lg:hidden ${theme.mobileOverlay}`}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar - Desktop */}
      <div
        className={`hidden lg:flex w-20 hover:w-64 transition-all duration-300 border-r flex-col py-8 group h-screen sticky top-0 ${theme.sidebar}`}
      >
        <div className="px-4 mb-12">
          <div
            className="w-12 h-12 bg-gradient-to-br from-[#5A7BFF] to-[#8F5CFF] rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 relative overflow-hidden group/logo cursor-pointer"
            onClick={handleLogoClick}
          >
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

        <div className="px-3 mt-auto space-y-2">
          <button
            onClick={() => navigate(userRole === 'ADMIN' ? "/admin" : "/profile/dashboard")}
            className={`w-full flex items-center gap-4 px-3 py-4 rounded-xl transition-all duration-300 ${theme.sidebarText} ${theme.sidebarHover}`}
          >
            <User className="w-6 h-6 flex-shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap font-medium text-sm">
              {userRole === 'ADMIN' ? '대시보드' : '프로파일링'}
            </span>
          </button>
          <button
            onClick={isLoggedIn ? handleLogout : () => navigate("/login")}
            className={`w-full flex items-center gap-4 px-3 py-4 rounded-xl transition-all duration-300 ${theme.sidebarText} ${theme.sidebarHover}`}
          >
            <LogOut className="w-6 h-6 flex-shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap font-medium text-sm">
              {isLoggedIn ? '로그아웃' : '로그인'}
            </span>
          </button>
        </div>
      </div>

      {/* Left Sidebar - Mobile */}
      <div
        className={`fixed left-0 top-0 h-full w-72 z-50 lg:hidden transform transition-transform duration-300 border-r flex flex-col py-6 ${
          theme.sidebar
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 mb-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleLogoClick}>
            <div className="w-10 h-10 bg-gradient-to-br from-[#5A7BFF] to-[#8F5CFF] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className={`font-bold text-lg ${darkMode ? "text-white" : "text-slate-900"}`}>
              DreamPath
            </span>
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
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className={`w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl transition-all duration-200 ${theme.sidebarText} ${theme.sidebarHover}`}
            >
              <LogOut className="w-5 h-5" />
              로그아웃
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-medium"
            >
              로그인
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className={`h-16 flex items-center justify-between px-4 md:px-8 border-b relative z-10 ${theme.header}`}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className={`lg:hidden p-2 rounded-lg ${theme.sidebarHover} ${theme.sidebarText}`}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={handleLogoClick}
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

            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className={`px-4 py-2 text-sm transition-colors hidden sm:flex items-center gap-2 ${theme.headerText}`}
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className={`px-4 py-2 text-sm transition-colors hidden sm:flex items-center gap-2 ${theme.headerText}`}
              >
                로그인
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>

        {/* Footer */}
        {showFooter && (
          <footer className={`py-6 text-center border-t ${theme.footer}`}>
            <p className="text-sm">© 2025 DreamPath</p>
          </footer>
        )}
      </div>

      {/* Floating Chatbot Button - Profile 페이지에서는 자체 AssistantChatbot 사용 */}
      {isLoggedIn && !location.pathname.startsWith('/profile') && (
        <button
          onClick={() => setChatbotOpen(!chatbotOpen)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white rounded-full shadow-lg shadow-purple-500/30 flex items-center justify-center hover:scale-110 transition-all duration-300 z-50 animate-bounce-slow"
        >
          <Bot size={32} strokeWidth={2} />
        </button>
      )}

      {/* Chatbot Overlay */}
      {chatbotOpen && !location.pathname.startsWith('/profile') && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setChatbotOpen(false)}
        />
      )}

      {/* Chatbot Panel */}
      {chatbotOpen && !location.pathname.startsWith('/profile') && (
        <div className="fixed bottom-28 right-8 w-[400px] h-[550px] bg-white rounded-3xl shadow-2xl z-50 overflow-hidden border border-gray-200 transform transition-all duration-300 animate-slide-up">
          <FaqChatbot onClose={() => setChatbotOpen(false)} />
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
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