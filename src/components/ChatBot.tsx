"use client";
import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

const ChatBot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! I'm Aroosi's AI assistant. I'm here to help you find meaningful connections and make the most of our platform. How can I assist you today?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const validateEmail = (email: string) => {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(emailInput)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmail(emailInput);
    setEmailError("");
  };

  const sendMessage = async () => {
    if (!input.trim() || !email) return;
    const userMsg = { role: "user", text: input, timestamp: Date.now() };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/gemini-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], email }),
      });
      const data = await res.json();
      setMessages((msgs) => [
        ...msgs,
        { role: "bot", text: data.reply, timestamp: Date.now() },
      ]);
    } catch (err) {
      console.error("Error sending message", err);
      setMessages((msgs) => [
        ...msgs,
        {
          role: "bot",
          text: "Sorry, I couldn't get a response. Please try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      {/* Floating Button */}
      {!open && (
        <button
          className="fixed bottom-6 right-6 z-50 bg-pink-600 hover:bg-pink-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
          onClick={() => setOpen(true)}
          aria-label="Open chat bot"
        >
          <MessageCircle className="w-7 h-7" />
        </button>
      )}
      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-pink-200 flex flex-col overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between bg-pink-600 text-white px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-bold text-lg">Aroosi AI Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="hover:bg-white/10 p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {!email ? (
            <form
              className="flex flex-col gap-3 p-6 bg-pink-50"
              onSubmit={handleEmailSubmit}
            >
              <label className="text-sm font-semibold text-gray-700">
                Enter your email to start chatting:
              </label>
              <input
                className="rounded-md border border-pink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all"
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                autoFocus
              />
              {emailError && (
                <div className="text-red-600 text-xs">{emailError}</div>
              )}
              <button
                type="submit"
                className="bg-pink-600 hover:bg-pink-700 text-white rounded-md px-4 py-2 mt-2 transition-all duration-300 hover:scale-[1.02]"
              >
                Start Chat
              </button>
            </form>
          ) : (
            <>
              <div
                className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-pink-50"
                style={{ minHeight: 300, maxHeight: 500 }}
              >
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`group relative rounded-2xl px-4 py-2 max-w-[85%] text-sm shadow-sm transition-all duration-300 ${
                        msg.role === "user"
                          ? "bg-pink-600 text-white"
                          : "bg-white text-gray-800 border border-pink-100 hover:border-pink-200"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {msg.role === "user" ? (
                          msg.text
                        ) : (
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => (
                                <p className="mb-2 last:mb-0 leading-relaxed">
                                  {children}
                                </p>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc pl-4 mb-2 space-y-1">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal pl-4 mb-2 space-y-1">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="leading-relaxed">{children}</li>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold">
                                  {children}
                                </strong>
                              ),
                              em: ({ children }) => (
                                <em className="italic">{children}</em>
                              ),
                              code: ({ children }) => (
                                <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">
                                  {children}
                                </code>
                              ),
                              h1: ({ children }) => (
                                <h1 className="text-lg font-bold mb-2">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-base font-bold mb-2">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-sm font-bold mb-2">
                                  {children}
                                </h3>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-2 border-pink-200 pl-3 my-2 italic">
                                  {children}
                                </blockquote>
                              ),
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        )}
                      </div>
                      <div
                        className={`text-xs mt-1 ${msg.role === "user" ? "text-pink-100" : "text-gray-400"}`}
                      >
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-800 border border-pink-100 rounded-2xl px-4 py-2 max-w-[85%] text-sm shadow-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <form
                className="flex items-center gap-2 border-t border-pink-100 bg-white p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!loading) sendMessage();
                }}
              >
                <input
                  className="flex-1 rounded-full border border-pink-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all"
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  autoFocus={open}
                />
                <button
                  type="submit"
                  className="bg-pink-600 hover:bg-pink-700 text-white rounded-full p-2 disabled:opacity-50 transition-all duration-300 hover:scale-110 disabled:hover:scale-100"
                  disabled={loading || !input.trim()}
                  aria-label="Send"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatBot;
