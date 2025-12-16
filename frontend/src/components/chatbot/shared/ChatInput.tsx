import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  darkMode?: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  placeholder = "메시지를 입력하세요...",
  disabled = false,
  darkMode = false,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disabled) {
      onSend();
    }
  };

  return (
    <div className={cn(
      "p-3 sm:p-4 border-t",
      darkMode
        ? "bg-[#0B0D14]/95 border-white/[0.06]"
        : "bg-white border-gray-200"
    )}>
      <div className="flex gap-2">
        <input
          className={cn(
            "flex-1 border px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm outline-none transition-all",
            darkMode
              ? "bg-white/[0.03] border-white/[0.1] text-white placeholder:text-white/40 focus:border-violet-500/50"
              : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-violet-500"
          )}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          onClick={onSend}
          disabled={disabled}
          className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white px-4 sm:px-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>
    </div>
  );
}