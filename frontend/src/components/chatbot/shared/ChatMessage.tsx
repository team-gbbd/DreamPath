import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  text: string;
  darkMode?: boolean;
}

export default function ChatMessage({ role, text, darkMode = false }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "mb-2 flex",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "px-3 sm:px-4 py-2 rounded-2xl max-w-[85%] sm:max-w-[75%] text-sm leading-relaxed break-words",
          role === "user"
            ? "bg-gradient-to-r from-violet-600 to-violet-500 text-white"
            : darkMode
              ? "bg-white/[0.05] text-white/90 border border-white/[0.08]"
              : "bg-white text-gray-900 shadow-sm"
        )}
      >
        {role === "assistant" ? (
          <div className="prose prose-sm max-w-none overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className={cn(
                    "font-semibold",
                    darkMode ? "text-white" : "text-gray-900"
                  )}>
                    {children}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 my-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 my-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="ml-2">{children}</li>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "underline",
                      darkMode ? "text-violet-400 hover:text-violet-300" : "text-blue-600 hover:text-blue-800"
                    )}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {text}
            </ReactMarkdown>
          </div>
        ) : (
          text
        )}
      </div>
    </div>
  );
}