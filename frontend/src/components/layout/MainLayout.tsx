import { useState, useEffect, type ReactNode } from "react";
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
  AlertCircle,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  PieChart,
  GraduationCap,
  BarChart3,
  Settings,
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
  const [showProfileRequiredModal, setShowProfileRequiredModal] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

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

  useEffect(() => {
    const profileRelatedPaths = [
      "/profile",
      "/job-analysis",
      "/job-recommendations",
      "/major-recommendations",
    ];
    const shouldExpandProfile = profileRelatedPaths.some(path =>
      location.pathname.startsWith(path)
    );

    setExpandedMenus(prev => {
      const hasProfile = prev.includes("profile");
      if (shouldExpandProfile && !hasProfile) {
        return [...prev, "profile"];
      }
      if (!shouldExpandProfile && hasProfile) {
        return prev.filter(item => item !== "profile");
      }
      return prev;
    });
  }, [location.pathname]);

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

  const handleSidebarClick = (item: any) => {
    // If item has subitems, toggle expansion
    if (item.subItems) {
      setExpandedMenus(prev =>
        prev.includes(item.type)
          ? prev.filter(t => t !== item.type)
          : [...prev, item.type]
      );
      // Removed return to allow navigation
    }

    setSidebarOpen(false); // Close mobile sidebar on navigation

    // 로그인하지 않은 상태에서의 처리
    if (!isLoggedIn) {
      // 진로 상담은 로그인 필요 메시지 후 로그인 페이지로
      if (item.type === "career") {
        navigate("/career-chat"); // career-chat 페이지에서 자체적으로 로그인 필요 처리
        return;
      }

      // 그 외 메뉴는 프로파일링 필요 모달 표시
      setShowProfileRequiredModal(true);
      return;
    }

    // 로그인된 상태에서의 정상 동작
    // Handle specific paths if provided
    if (item.path) {
      // Special case for admin dashboard
      if (item.type === 'profile' && userRole === 'ADMIN') {
        navigate("/admin");
      } else {
        navigate(item.path);
      }
    }
  };

  const sidebarItems = [
    { type: "home", icon: Home, label: "홈", path: "/" },
    { type: "career", icon: MessageSquare, label: "진로 상담", path: "/career-chat" },
    {
      type: "profile",
      icon: BarChart3,
      label: userRole === 'ADMIN' ? '대시보드' : '프로파일링',
      path: userRole === 'ADMIN' ? "/admin" : "/profile/dashboard",
      subItems: userRole === 'ADMIN' ? undefined : [
        { label: "대시보드", path: "/profile/dashboard?tab=dashboard", icon: LayoutDashboard },
        { label: "성향 및 가치관 분석", path: "/profile/dashboard?tab=personality", icon: PieChart },
        { label: "직업 추천", path: "/profile/dashboard?tab=jobs", icon: Briefcase },
        { label: "학과 추천", path: "/profile/dashboard?tab=majors", icon: GraduationCap },
      ]
    },
    { type: "job", icon: Briefcase, label: "채용 추천", path: "/job-recommendations" },
    {
      type: "mentoring",
      icon: Users,
      label: "멘토링",
      path: "/mentoring",
      subItems: [
        { label: "멘토링 현황", path: "/profile/dashboard?tab=mentoring", icon: Users }
      ]
    },
    {
      type: "learning",
      icon: BookOpen,
      label: "학습",
      path: "/learning",
      subItems: [
        { label: "학습 현황", path: "/profile/dashboard?tab=learning", icon: BookOpen }
      ]
    },
    { type: "settings", icon: Settings, label: "계정 정보", path: "/profile/dashboard?tab=settings" },
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
    border: darkMode ? "border-white/20" : "border-slate-200",
  };

  return (
    <div className={`h-screen ${theme.bg} flex relative w-full overflow-hidden`}>
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
          {sidebarItems.map((item) => {
            const isExpanded = expandedMenus.includes(item.type);
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : (item.path && location.pathname.startsWith(item.path));

            return (
              <div key={item.type} className="w-full">
                <button
                  onClick={() => handleSidebarClick(item)}
                  className={`w-full flex items-center gap-4 px-3 py-4 rounded-xl transition-all duration-300 group/nav relative
                    ${(isActive && !item.subItems && item.type !== 'profile' && item.type !== 'mentoring' && item.type !== 'learning')
                      ? (darkMode ? "bg-white/10 text-white shadow-lg shadow-white/5" : "bg-indigo-50 text-indigo-600 shadow-sm")
                      : `${theme.sidebarText} ${theme.sidebarHover}`
                    }
                  `}
                >
                  <div className="relative">
                    <item.icon className={`w-6 h-6 flex-shrink-0 transition-transform group-hover/nav:scale-110 ${(isActive && !item.subItems && item.type !== 'profile' && item.type !== 'mentoring' && item.type !== 'learning') ? (darkMode ? "text-white" : "text-indigo-600") : ""}`} />
                    {!(isActive && !item.subItems && item.type !== 'profile' && item.type !== 'mentoring' && item.type !== 'learning') && (
                      <div className="absolute -inset-2 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg opacity-0 group-hover/nav:opacity-20 blur transition-opacity" />
                    )}
                  </div>

                  <div className="flex-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 overflow-hidden">
                    <span className={`whitespace-nowrap font-medium text-sm ${(isActive && !item.subItems && item.type !== 'profile' && item.type !== 'mentoring' && item.type !== 'learning') ? "font-bold" : ""}`}>
                      {item.label}
                    </span>
                    {item.subItems && (
                      <div>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    )}
                  </div>
                </button>

                {/* Submenu */}
                {item.subItems && isExpanded && (
                  <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-6 pl-4 space-y-1 mt-1 ${(item.type === 'mentoring' || item.type === 'learning') ? '' : `border-l-2 ${theme.border}`}`}>
                    {item.subItems.map((subItem) => {
                      // Sub-items now mimic the main item design but smaller/indented
                      return (
                        <button
                          key={subItem.path}
                          onClick={() => navigate(subItem.path)}
                          className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 group/subnav ${theme.sidebarText} ${theme.sidebarHover}`}
                        >
                          {/* Icon removed as per request */}
                          {/* <div className="relative">
                            <subItem.icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover/subnav:scale-110" />
                            <div className="absolute -inset-2 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg opacity-0 group-hover/subnav:opacity-10 blur transition-opacity" />
                          </div> */}
                          <span className="whitespace-nowrap font-medium text-sm">
                            {subItem.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="px-3 mt-auto space-y-2">
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
        className={`fixed left-0 top-0 h-full w-72 z-50 lg:hidden transform transition-transform duration-300 border-r flex flex-col py-6 ${theme.sidebar
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

        <nav className="flex-1 px-3 space-y-2 overflow-y-auto min-h-0">
          {sidebarItems.map((item) => {
            const isExpanded = expandedMenus.includes(item.type);
            const isActive = location.pathname === item.path || (item.subItems && item.subItems.some(sub => location.pathname === sub.path));

            return (
              <div key={item.type}>
                <button
                  onClick={() => handleSidebarClick(item)}
                  className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all duration-200 
                    ${(isExpanded || isActive) && item.subItems ? "bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white shadow-lg" : `${theme.sidebarText} ${theme.sidebarHover}`}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <item.icon className="w-6 h-6 flex-shrink-0" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  {item.subItems && (
                    <div>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  )}
                </button>

                {/* Mobile Submenu */}
                {item.subItems && isExpanded && (
                  <div className="ml-8 mt-2 space-y-1 border-l-2 border-purple-500/20 pl-4 py-2">
                    {item.subItems.map((subItem) => {
                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <button
                          key={subItem.path}
                          onClick={() => {
                            navigate(subItem.path);
                            setSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-sm
                            ${isSubActive
                              ? "text-[#6C5CE7] font-bold bg-purple-50 dark:bg-white/10 dark:text-white"
                              : darkMode ? "text-white/60" : "text-slate-600"}
                          `}
                        >
                          <subItem.icon className={`w-4 h-4 ${isSubActive ? "text-[#6C5CE7] dark:text-white" : ""}`} />
                          <span className="font-medium">{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="px-3 pt-2 flex-shrink-0 space-y-2">
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${theme.sidebarText} ${theme.sidebarHover}`}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">로그아웃</span>
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-medium"
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
        <div className={`flex-1 overflow-x-hidden overflow-y-auto w-full max-w-full`}>
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
        <div className={`fixed z-50 overflow-hidden transform transition-all duration-300 animate-slide-up
          bottom-4 right-4 left-4 h-[calc(100vh-120px)]
          sm:bottom-28 sm:right-8 sm:left-auto sm:w-[380px] sm:h-[500px]
          md:w-[400px] md:h-[550px]
          rounded-2xl sm:rounded-3xl shadow-2xl border
          ${darkMode ? "bg-[#0B0D14] border-white/[0.08]" : "bg-white border-gray-200"}
        `}>
          <FaqChatbot onClose={() => setChatbotOpen(false)} />
        </div>
      )}

      {/* Profile Required Modal */}
      {showProfileRequiredModal && (
        <>
          <div
            className={`fixed inset-0 z-[60] ${theme.mobileOverlay}`}
            onClick={() => setShowProfileRequiredModal(false)}
          />
          <div className={`fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-[90%] max-w-md p-6 rounded-2xl shadow-2xl border
            ${darkMode ? "bg-[#0f0f14] border-white/10" : "bg-white border-gray-200"}
          `}>
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${darkMode ? "bg-amber-500/20" : "bg-amber-100"
                }`}>
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
                성향 프로파일링이 필요합니다
              </h3>
              <p className={`text-sm mb-6 leading-relaxed ${darkMode ? "text-white/60" : "text-slate-600"}`}>
                이 기능을 이용하려면 먼저 진로상담을 통해<br />
                성향 프로파일링을 진행해주세요!
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowProfileRequiredModal(false)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${darkMode
                    ? "bg-white/10 text-white/70 hover:bg-white/20"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  닫기
                </button>
                <button
                  onClick={() => {
                    setShowProfileRequiredModal(false);
                    navigate("/career-chat");
                  }}
                  className="flex-1 py-3 rounded-xl font-medium bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white hover:shadow-lg transition-all"
                >
                  진로상담 하기
                </button>
              </div>
            </div>
          </div>
        </>
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
