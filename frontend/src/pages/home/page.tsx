import { useEffect, useState } from "react";
import LandingPage from "./LandingPage";
import HomePage from "./HomePage";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem("dreampath:user");
      setIsLoggedIn(!!user);
    };

    checkAuth();

    // Listen for auth changes
    window.addEventListener("dreampath-auth-change", checkAuth);
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("dreampath-auth-change", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  // Loading state
  const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('dreampath:theme') : null;
  const isDark = savedTheme === 'dark' || savedTheme === null;

  if (isLoggedIn === null) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100'}`}>
        <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${isDark ? 'border-purple-500' : 'border-[#5A7BFF]'}`}></div>
      </div>
    );
  }

  // Not logged in - show landing page
  if (!isLoggedIn) {
    return <LandingPage />;
  }

  // Logged in - show home page
  return <HomePage />;
}