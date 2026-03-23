import { Search, Bell, ChevronDown, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export function TopNav() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-20"
    >
      {/* Greeting */}
      <div>
        <h1 className="text-lg font-semibold text-foreground leading-tight">
          Good morning, Arjun 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          You have 3 lessons today
        </p>
      </div>

      {/* Search + Actions */}
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search courses, topics..."
            className="w-64 h-9 pl-9 pr-4 rounded-xl bg-muted/60 border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        <button className="relative w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-dei-peach rounded-full" />
        </button>

        <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-muted/60 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-dei-peach to-dei-rose flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">AK</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
        </button>

        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="flex h-9 items-center gap-1 rounded-xl bg-muted/60 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </motion.header>
  );
}
