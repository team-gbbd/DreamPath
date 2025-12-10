import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../base/Button";
import { useToast } from "../common/Toast";

export default function Header() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [currentUser, setCurrentUser] = useState<{ name: string; role?: string } | null>(null);

  useEffect(() => {
    const syncUser = () => {
      const stored = localStorage.getItem("dreampath:user");
      setCurrentUser(stored ? JSON.parse(stored) : null);
    };

    syncUser();
    const authHandler = () => syncUser();
    const storageHandler = () => syncUser();
    window.addEventListener("dreampath-auth-change", authHandler as EventListener);
    window.addEventListener("storage", storageHandler as EventListener);
    return () => {
      window.removeEventListener("dreampath-auth-change", authHandler as EventListener);
      window.removeEventListener("storage", storageHandler as EventListener);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("dreampath:user");

    // 챗봇 세션 및 대화 내용 초기화
    sessionStorage.removeItem("assistant_chatbot_session_id");
    sessionStorage.removeItem("assistant_chatbot_messages");
    sessionStorage.removeItem("chatbot_session_id");
    sessionStorage.removeItem("chatbot_messages");
    sessionStorage.removeItem("faq_chatbot_session_id");
    sessionStorage.removeItem("faq_chatbot_messages");

    // 마지막 사용자 ID 초기화 (다음 로그인 시 변경 감지용)
    localStorage.setItem("assistant_chatbot_last_user_id", "null");
    localStorage.setItem("chatbot_last_user_id", "null");
    localStorage.setItem("faq_chatbot_last_user_id", "null");

    window.dispatchEvent(new Event("dreampath-auth-change"));
    showToast("로그아웃되었습니다.", "success");
    navigate("/", { replace: true });
  };

  const navItems = [
    { name: '진로 상담', href: '/career-chat', isRoute: true },
    { name: '채용 추천', href: '/job-recommendations', isRoute: true },
    { name: '멘토링', href: '/mentoring', isRoute: true, requiresAuth: true }
  ];

  return (
    <>
      <ToastContainer />
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 cursor-pointer">
              <img
                src="https://static.readdy.ai/image/b6e15883c9875312b01889a8e71bf8cf/ccfcaec324d8c4883819f9f330e8ceab.png"
                alt="DreamPath Logo"
                className="h-10 w-10"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">
                DreamPath
              </h1>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                item.isRoute ? (
                  item.requiresAuth && !currentUser ? (
                    <button
                      key={item.name}
                      onClick={() => {
                        showToast('로그인이 필요합니다.', 'warning');
                        navigate('/login');
                      }}
                      className="text-gray-700 hover:text-[#5A7BFF] transition-colors duration-200 font-medium"
                    >
                      {item.name}
                    </button>
                  ) : (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={item.isDev
                        ? "text-blue-600 hover:text-blue-700 transition-colors duration-200 font-semibold"
                        : "text-gray-700 hover:text-[#5A7BFF] transition-colors duration-200 font-medium"
                      }
                    >
                      {item.name}
                    </Link>
                  )
                ) : (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-gray-700 hover:text-[#5A7BFF] transition-colors duration-200 font-medium"
                  >
                    {item.name}
                  </a>
                )
              ))}
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              {currentUser ? (
                <>
                  <Link to={currentUser.role === 'ADMIN' ? '/admin' : '/profile/dashboard'}>
                    <Button variant="secondary" size="sm">
                      <i className={currentUser.role === 'ADMIN' ? 'ri-dashboard-line mr-1' : 'ri-user-line mr-1'}></i>
                      {currentUser.role === 'ADMIN' ? '대시보드' : '프로파일링'}
                    </Button>
                  </Link>
                  <Button size="sm" onClick={handleLogout}>
                    로그아웃
                  </Button>
                </>
              ) : (
                <Link to="/login">
                  <Button size="sm">
                    로그인하기
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button className="text-gray-700 hover:text-[#5A7BFF] p-2">
                <i className="ri-menu-line text-xl"></i>
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
