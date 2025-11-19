"use client";

import { useState } from "react";
import Chatbot from "./Chatbot";

export default function FloatingChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] 
             text-white rounded-full shadow-lg flex items-center justify-center 
             hover:scale-105 transition-all z-50 animate-[wiggle_1.5s_ease-in-out_infinite]"
      >
        💬
      </button>

      {/* Overlay (배경) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-sm z-60"
          onClick={() => setOpen(false)}
        ></div>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          className={`fixed bottom-24 right-6 w-[420px] h-[600px] bg-white rounded-3xl shadow-xl z-50 p-0 overflow-hidden border border-gray-200 transform transition-all duration-300 ${
            open
              ? "scale-100 opacity-100"
              : "scale-90 opacity-0 pointer-events-none"
          }`}
        >
          <Chatbot />
        </div>
      )}
    </>
  );
}
