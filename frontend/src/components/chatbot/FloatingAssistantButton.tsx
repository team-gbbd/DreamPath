"use client";

import { useState } from "react";
import AssistantChatbot from "@/components/chatbot/AssistantChatbot";
import { Bot } from "lucide-react";

/**
 * Dashboard 전용 AI 비서 Floating Button
 * Dashboard 페이지에서만 import하여 사용
 */
export default function FloatingAssistantButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-9 right-9 w-16 h-16 scale-100 bg-gradient-to-r from-purple-500 to-pink-500 
             text-white rounded-full shadow-lg flex items-center justify-center 
             hover:scale-105 transition-all z-50 animate-[wiggle_1.5s_ease-in-out_infinite]"
        title="AI 비서"
      >
        <Bot size={32} strokeWidth={2} />
      </button>

      {/* Overlay (배경) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[60]"
          onClick={() => setOpen(false)}
        ></div>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          className={`fixed bottom-32 right-9 w-[420px] h-[600px] bg-white rounded-3xl shadow-xl z-[70] p-0 overflow-hidden border border-gray-200 transform transition-all duration-300 ${
            open
              ? "scale-100 opacity-100"
              : "scale-90 opacity-0 pointer-events-none"
          }`}
        >
          <AssistantChatbot onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
