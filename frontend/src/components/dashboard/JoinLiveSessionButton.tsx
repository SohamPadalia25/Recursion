import { motion } from "framer-motion";
import { LogIn, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function JoinLiveSessionButton() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [sessionCode, setSessionCode] = useState("");

  const handleJoinSession = () => {
    if (sessionCode.trim()) {
      navigate("/student/join-session", {
        state: {
          joinSessionCode: sessionCode.trim(),
          initiatedFrom: "student-dashboard-join",
        },
      });
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowModal(true)}
        className="w-full dei-gradient-sky text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
      >
        <LogIn className="w-5 h-5" />
        Join Live Session
      </motion.button>

      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background dei-card p-6 max-w-md mx-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg dei-gradient-sky flex items-center justify-center">
                <Zap className="w-5 h-5 text-dei-sky" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Join Live Session</h3>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Enter the session code provided by your instructor to join their live class.
            </p>

            <input
              type="text"
              placeholder="Enter session code (e.g., CLASS-2025-001)"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-dei-sky mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-input text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleJoinSession}
                disabled={!sessionCode.trim()}
                className="flex-1 px-4 py-2 rounded-lg dei-gradient-sky text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all"
              >
                Join Now
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
