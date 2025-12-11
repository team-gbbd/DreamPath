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
  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
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