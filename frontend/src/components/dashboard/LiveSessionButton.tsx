import { motion } from "framer-motion";
import { Video, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function LiveSessionButton() {
  const navigate = useNavigate();

  const handleStartSession = () => {
    navigate("/student/join-session", {
      state: {
        initiatedFrom: "student-dashboard",
      },
    });
  };

  return (
    <motion.div
      whileHover={{ x: -2, transition: { duration: 0.2 } }}
      onClick={handleStartSession}
      className="dei-card p-4 group cursor-pointer transition-all hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl dei-gradient-sky flex items-center justify-center flex-shrink-0">
          <Video className="w-4 h-4 text-dei-sky" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-dei-sky">
              Live Session
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-snug">
            Connect with Instructor
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Start a live video session with your instructor
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Get real-time help, ask questions, and collaborate
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
      </div>
    </motion.div>
  );
}
