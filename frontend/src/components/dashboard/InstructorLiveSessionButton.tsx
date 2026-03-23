import { motion } from "framer-motion";
import { Video, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function InstructorLiveSessionButton() {
  const navigate = useNavigate();

  const handleStartSession = () => {
    navigate("/instructor/live-session", {
      state: {
        initiatedFrom: "instructor-dashboard",
      },
    });
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleStartSession}
      className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2 group"
    >
      <Video className="w-4 h-4 group-hover:animate-pulse" />
      Start Live Session
      <Users className="w-4 h-4 ml-1" />
    </motion.button>
  );
}
