import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Calendar,
  MessageSquare,
  Network,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trophy,
  LogOut,
  FileText,
  AudioLines,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/student" },
  { icon: BookOpen, label: "Courses", to: "/student/courses" },
  { icon: BarChart3, label: "Progress", to: "/student/progress" },
  { icon: Calendar, label: "Lecture", to: "/student/lecture" },
  { icon: Trophy, label: "Certificates", to: "/student/certificates" },
  { icon: MessageSquare, label: "Practice", to: "/student/practice" },
  { icon: FileText, label: "My Notes", to: "/student/notes" },
  { icon: Network, label: "Roadmap", to: "/student/roadmap" },
  { icon: Network, label: "Neo4j Insights", to: "/student/neo4j-insights" },
  { icon: Sparkles, label: "AI Tools", to: "/student/tools" },
  { icon: AudioLines, label: "Media Pipeline", to: "/student/media-pipeline" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 220 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="h-screen sticky top-0 flex flex-col bg-card border-r border-border/50 z-30"
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-border/50">
        <motion.div
          className="flex items-center gap-2 overflow-hidden"
          animate={{ width: collapsed ? 40 : 120 }}
        >
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-bold text-lg">D</span>
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-xl tracking-tight text-foreground"
            >
              ei
            </motion.span>
          )}
        </motion.div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isCourseDetail = location.pathname.startsWith("/student/course/");
          const isRoadmapCourse = location.pathname.startsWith("/student/roadmap/course/");
          const isNeo4jInsights = location.pathname.startsWith("/student/neo4j-insights");
          const isActive = item.to === "/student"
            ? location.pathname === "/student"
            : item.to === "/student/courses"
              ? location.pathname.startsWith(item.to) || isCourseDetail
              : item.to === "/student/roadmap"
                ? location.pathname.startsWith(item.to) || isRoadmapCourse
                : item.to === "/student/neo4j-insights"
                  ? isNeo4jInsights
                : location.pathname.startsWith(item.to);

          return (
            <motion.button
              key={item.label}
              onClick={() => navigate(item.to)}
              whileTap={{ scale: 0.96 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 group relative ${isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm font-medium whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Settings + Collapse */}
      <div className="p-2 space-y-1 border-t border-border/50">
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
