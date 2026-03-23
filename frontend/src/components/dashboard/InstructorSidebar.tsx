import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    BookOpen,
    Users,
    BarChart3,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    LogOut,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";

const sidebarItems = [
    { icon: LayoutDashboard, label: "Overview", to: "/instructor" },
    { icon: BookOpen, label: "Course Builder", to: "/instructor/course-builder" },
    { icon: Users, label: "Teaching Tools", to: "/instructor/teaching-tools" },
    { icon: BarChart3, label: "Analytics", to: "/instructor/analytics" },
    { icon: MessageSquare, label: "Quiz Builder", to: "/instructor/quiz-builder" },
];

export function InstructorSidebar() {
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
            <div className="flex items-center justify-center h-16 border-b border-border/50">
                <motion.div className="flex items-center gap-2 overflow-hidden" animate={{ width: collapsed ? 40 : 140 }}>
                    <div className="w-9 h-9 rounded-xl bg-dei-sage flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-5 h-5 text-primary-foreground" />
                    </div>
                    {!collapsed && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-sm tracking-tight text-foreground whitespace-nowrap">
                            Instructor
                        </motion.span>
                    )}
                </motion.div>
            </div>

            <nav className="flex-1 py-4 px-2 space-y-1">
                {sidebarItems.map((navItem) => {
                    const isActive = navItem.to === "/instructor" ? location.pathname === "/instructor" : location.pathname.startsWith(navItem.to);

                    return (
                        <motion.button
                            key={navItem.label}
                            onClick={() => navigate(navItem.to)}
                            whileTap={{ scale: 0.96 }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 relative ${isActive ? "bg-dei-sage/15 text-dei-sage" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="instructor-sidebar-active"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-dei-sage rounded-r-full"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <navItem.icon className="w-5 h-5 flex-shrink-0" />
                            {!collapsed && (
                                <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="text-sm font-medium whitespace-nowrap">
                                    {navItem.label}
                                </motion.span>
                            )}
                        </motion.button>
                    );
                })}
            </nav>

            <div className="space-y-1 p-2 border-t border-border/50">
                <button
                    onClick={() => {
                        logout();
                        navigate("/login");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
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
