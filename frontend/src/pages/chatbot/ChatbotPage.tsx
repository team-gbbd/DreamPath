import { useState, useEffect } from "react";
import Chatbot from "@/components/feature/Chatbot";

export default function ChatbotPage() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dreampath:theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    const handleThemeChange = () => {
      setDarkMode(localStorage.getItem("dreampath:theme") === "dark");
    };
    window.addEventListener("dreampath-theme-change", handleThemeChange);
    window.addEventListener("storage", handleThemeChange);
    return () => {
      window.removeEventListener("dreampath-theme-change", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  return (
    <div
      style={{
        height: 'calc(100vh - 64px)',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: darkMode ? '#0B0D14' : '#f1f5f9',
        boxSizing: 'border-box',
      }}
    >
      {/* Background Effects */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: 'min(40vw, 300px)',
            height: 'min(40vw, 300px)',
            borderRadius: '50%',
            filter: 'blur(80px)',
            backgroundColor: darkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(167, 139, 250, 0.15)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '25%',
            left: '-50px',
            width: 'min(35vw, 250px)',
            height: 'min(35vw, 250px)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            backgroundColor: darkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(96, 165, 250, 0.15)',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: darkMode
            ? 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)'
            : 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Chatbot Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '48rem',
            height: '100%',
            maxHeight: '700px',
          }}
        >
          <Chatbot darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
}