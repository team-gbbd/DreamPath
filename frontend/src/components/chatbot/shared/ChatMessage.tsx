import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  text: string;
}

export default function ChatMessage({ role, text }: ChatMessageProps) {
  return (
    <div
      className={`mb-2 flex ${
        role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`px-4 py-2 rounded-2xl max-w-[75%] text-sm leading-relaxed break-words ${
          role === "user"
            ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
            : "bg-white text-gray-1000"
        }`}
      >
        {role === "assistant" ? (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-900">
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
