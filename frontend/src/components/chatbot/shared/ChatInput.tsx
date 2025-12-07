interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  placeholder = "메시지를 입력하세요...",
  disabled = false,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disabled) {
      onSend();
    }
  };

  return (
    <div className="p-4 border-t bg-white">
      <div className="flex gap-2">
        <input
          className="flex-1 border p-3 rounded-xl"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          onClick={onSend}
          disabled={disabled}
          className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          전송
        </button>
      </div>
    </div>
  );
}
