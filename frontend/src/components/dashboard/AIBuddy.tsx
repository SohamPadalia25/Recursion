import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Mic } from "lucide-react";

export function AIBuddy() {
  const [open, setOpen] = useState(false);

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
                  <h3 className="font-semibold text-foreground text-sm">StudyBuddyAI Buddy</h3>
                  <p className="text-xs text-muted-foreground">Ask me anything about your courses</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="p-4 h-52 overflow-y-auto space-y-3">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                </div>
                <div className="bg-muted/60 rounded-2xl rounded-tl-md px-3 py-2 max-w-[85%]">
                  <p className="text-xs text-foreground leading-relaxed">
                    Hi Arjun! 👋 I noticed you're stuck on backpropagation. Want me to explain it with a visual analogy?
                  </p>
                </div>
              </div>

              {/* Voice wave indicator */}
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
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                <input
                  placeholder="Ask a question..."
                  className="flex-1 h-9 px-3 rounded-xl bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center hover:opacity-90 transition-opacity">
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
