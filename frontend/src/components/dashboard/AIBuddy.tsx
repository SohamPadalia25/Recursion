import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Mic } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { getMyLearning } from "@/lib/course-api";

type BuddyMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type TutorChatResponse = {
  sessionId: string;
  reply: string;
  messageCount: number;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

export function AIBuddy() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<BuddyMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      text: "Hi! Ask me anything about your course and I will guide you with personalized next steps.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<string>("");
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [error, setError] = useState("");

  const location = useLocation();
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const routeCourseId = useMemo(() => {
    const match = location.pathname.match(/\/course\/([a-f\d]{24})/i);
    return match?.[1] || "";
  }, [location.pathname]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    let mounted = true;

    async function resolveCourseContext() {
      if (routeCourseId) {
        setActiveCourseId(routeCourseId);
        return;
      }

      try {
        const enrollments = await getMyLearning();
        if (!mounted) return;
        const fallbackCourseId = enrollments?.[0]?.course?._id || "";
        setActiveCourseId(fallbackCourseId);
      } catch {
        if (!mounted) return;
        setActiveCourseId("");
      }
    }

    if (open) {
      void resolveCourseContext();
    }

    return () => {
      mounted = false;
    };
  }, [open, routeCourseId]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    if (!text.trim()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (!activeCourseId) {
      setError("Open a course first or enroll in one so AI Buddy can personalize help.");
      return;
    }

    setError("");
    setLoading(true);

    const userMsg: BuddyMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const data = await apiRequest<TutorChatResponse>("/api/v1/ai/tutor/chat", {
        method: "POST",
        body: {
          courseId: activeCourseId,
          message: trimmed,
          sessionId,
        },
      });

      if (data?.sessionId) setSessionId(data.sessionId);

      const assistantText = String(data?.reply || "I could not generate a response right now.");
      const aiMsg: BuddyMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: assistantText,
      };
      setMessages((prev) => [...prev, aiMsg]);
      speakText(assistantText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to contact AI Buddy";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          text: "I hit an issue while responding. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    const SpeechRecognitionCtor = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as BrowserSpeechRecognitionCtor | undefined;

    if (!SpeechRecognitionCtor) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript.trim());
    };

    recognition.onerror = () => {
      setIsListening(false);
      setError("Could not capture voice. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setError("");
    setIsListening(true);
    recognition.start();
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-50 dei-glow"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div key="spark" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} className="animate-pulse-soft">
              <Sparkles className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-6 w-80 bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="dei-gradient-peach px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Dei AI Buddy</h3>
                  <p className="text-xs text-muted-foreground">Ask me anything about your courses</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="p-4 h-52 overflow-y-auto space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" ? (
                    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-primary" />
                    </div>
                  ) : null}
                  <div className={`${msg.role === "assistant" ? "bg-muted/60 rounded-2xl rounded-tl-md" : "bg-primary text-primary-foreground rounded-2xl rounded-tr-md"} px-3 py-2 max-w-[85%]`}>
                    <p className="text-xs leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}

              {loading ? (
                <div className="flex items-center justify-center gap-1 py-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary/40 rounded-full"
                      animate={{ height: [8, 20, 8] }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.12,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              ) : null}

              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border/50">
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{activeCourseId ? "Personalized by your course progress" : "No course context detected"}</span>
                <button
                  type="button"
                  onClick={() => setVoiceEnabled((prev) => !prev)}
                  className="rounded px-2 py-0.5 hover:bg-muted/60"
                >
                  Voice reply: {voiceEnabled ? "On" : "Off"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                  placeholder="Ask a question..."
                  className="flex-1 h-9 px-3 rounded-xl bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isListening ? "bg-primary/20" : "bg-muted/60 hover:bg-muted"}`}
                >
                  <Mic className={`w-4 h-4 ${isListening ? "text-primary" : "text-muted-foreground"}`} />
                </button>
                <button
                  type="button"
                  onClick={() => void sendMessage(input)}
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
