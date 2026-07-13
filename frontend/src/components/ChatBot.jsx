import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Minimize2, Maximize2 } from "lucide-react";
import toast from "react-hot-toast";
import { chatbotService } from "../services/chatbotService.js";

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      type: "bot",
      text: "👋 Hi! I'm your attendance assistant. I can help you with marking attendance, face verification, and more. What can I help you with?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const response = await chatbotService.sendMessage(
        inputValue,
        messages.filter((m) => m.type !== "welcome").map((m) => ({
          role: m.type === "bot" ? "assistant" : "user",
          content: m.text,
        }))
      );

      const botMessage = {
        id: `msg-${Date.now()}-bot`,
        type: "bot",
        text: response.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      toast.error(err.message);
      const errorMessage = {
        id: `msg-${Date.now()}-error`,
        type: "bot",
        text: "Sorry, I encountered an error. Please try again or contact support.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome",
        type: "bot",
        text: "👋 Hi! I'm your attendance assistant. I can help you with marking attendance, face verification, and more. What can I help you with?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setIsMinimized(false);
        }}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 p-4 text-white shadow-lg transition hover:scale-110 hover:shadow-xl"
        style={{ width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center" }}
        title="Chat Assistant"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed z-50 rounded-3xl bg-slate-950 shadow-2xl border border-slate-800"
          style={{
            bottom: isMinimized ? 80 : 24,
            right: 24,
            width: isMinimized ? 360 : 420,
            height: isMinimized ? 60 : 600,
            display: "flex",
            flexDirection: "column",
            transition: "all 0.3s ease",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-4 rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
              <div>
                <p className="text-sm font-bold text-white">Attendance Assistant</p>
                <p className="text-xs text-indigo-200">Always online</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-indigo-600 rounded-lg transition"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>
            </div>
          </div>

          {/* Messages Area */}
          {!isMinimized && (
            <>
              <div
                className="flex-1 overflow-y-auto p-4 space-y-4"
                style={{ scrollBehavior: "smooth" }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${
                        msg.type === "user"
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700"
                      }`}
                      style={{ wordWrap: "break-word" }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-bl-none px-4 py-2.5 border border-slate-700 flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-slate-800 bg-slate-900/50 p-4 rounded-b-3xl">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your question..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputValue.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-full p-2.5 transition"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </form>

                {/* Quick Actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleClearChat}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-full transition"
                  >
                    Clear Chat
                  </button>
                  <a
                    href="/student/reports"
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-400 px-2.5 py-1.5 rounded-full transition"
                  >
                    View Reports
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
