import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  Clock,
  Star,
  Eye,
  FileText,
  Video,
  Search,
  Bell,
  ChevronDown,
  ArrowUpRight,
  GraduationCap,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthContext";
import { InstructorLiveSessionButton } from "@/components/dashboard/InstructorLiveSessionButton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Overview", to: "/instructor" },
  { icon: BookOpen, label: "Course Builder", to: "/instructor/course-builder" },
  { icon: Users, label: "Teaching Tools", to: "/instructor/teaching-tools" },
  { icon: BarChart3, label: "Analytics", to: "/instructor/analytics" },
  { icon: MessageSquare, label: "Quiz Builder", to: "/instructor/quiz-builder" },
];

const enrollmentData = [
  { month: "Jan", students: 120 },
  { month: "Feb", students: 185 },
  { month: "Mar", students: 240 },
  { month: "Apr", students: 310 },
  { month: "May", students: 295 },
  { month: "Jun", students: 420 },
  { month: "Jul", students: 480 },
];

const revenueData = [
  { month: "Jan", revenue: 2400 },
  { month: "Feb", revenue: 3800 },
  { month: "Mar", revenue: 5200 },
  { month: "Apr", revenue: 6100 },
  { month: "May", revenue: 5800 },
  { month: "Jun", revenue: 8400 },
  { month: "Jul", revenue: 9200 },
];

const courses = [
  {
    title: "Machine Learning Fundamentals",
    students: 847,
    rating: 4.8,
    revenue: "₹12,450",
    status: "Published",
    trend: "up" as const,
    trendValue: "+12%",
    lessons: 24,
    completionRate: 72,
  },
  {
    title: "Python for Data Science",
    students: 1243,
    rating: 4.9,
    revenue: "₹18,200",
    status: "Published",
    trend: "up" as const,
    trendValue: "+8%",
    lessons: 32,
    completionRate: 68,
  },
  {
    title: "Deep Learning with PyTorch",
    students: 392,
    rating: 4.7,
    revenue: "₹5,680",
    status: "Published",
    trend: "down" as const,
    trendValue: "-3%",
    lessons: 18,
    completionRate: 54,
  },
  {
    title: "NLP Masterclass",
    students: 0,
    rating: 0,
    revenue: "—",
    status: "Draft",
    trend: "up" as const,
    trendValue: "",
    lessons: 8,
    completionRate: 0,
  },
];

const recentActivity = [
  { type: "enrollment", text: "23 new students enrolled in ML Fundamentals", time: "2h ago" },
  { type: "review", text: 'New 5-star review on Python for Data Science: "Best course ever!"', time: "4h ago" },
  { type: "question", text: "12 unresolved Q&A threads need attention", time: "6h ago" },
  { type: "milestone", text: "Python course crossed 1,200 students 🎉", time: "1d ago" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function InstructorDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 220 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="h-screen sticky top-0 flex flex-col bg-card border-r border-border/50 z-30"
      >
        <div className="flex items-center justify-center h-16 border-b border-border/50">
          <motion.div className="flex items-center gap-2 overflow-hidden" animate={{ width: sidebarCollapsed ? 40 : 140 }}>
            <div className="w-9 h-9 rounded-xl bg-dei-sage flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
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
                {!sidebarCollapsed && (
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
            {!sidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center py-2 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Nav */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-20"
        >
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">Instructor Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, Dr. Mehra</p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" className="rounded-xl gap-2 bg-dei-sage hover:bg-dei-sage/90">
              <Plus className="w-4 h-4" /> New Course
            </Button>
            <button className="relative w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-dei-rose rounded-full" />
            </button>
            <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-muted/60 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-dei-sage to-dei-sky flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">SM</span>
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

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* Live Session Button */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 max-w-md"
          >
            <InstructorLiveSessionButton />
          </motion.div>

          {/* Stats */}
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Students", value: "2,482", icon: Users, gradient: "dei-gradient-sky", color: "text-dei-sky", trend: "+18%", trendUp: true },
              { label: "Active Courses", value: "3", icon: BookOpen, gradient: "dei-gradient-sage", color: "text-dei-sage", trend: "+1", trendUp: true },
              { label: "Total Revenue", value: "₹36,330", icon: TrendingUp, gradient: "dei-gradient-amber", color: "text-dei-amber", trend: "+24%", trendUp: true },
              { label: "Avg Rating", value: "4.8", icon: Star, gradient: "dei-gradient-peach", color: "text-dei-peach", trend: "+0.2", trendUp: true },
            ].map((stat) => (
              <motion.div key={stat.label} variants={item} whileHover={{ y: -2, transition: { duration: 0.2 } }} className="dei-card p-5 flex items-center gap-4 cursor-default">
                <div className={`w-12 h-12 rounded-2xl ${stat.gradient} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stat.trendUp ? "bg-dei-sage/10 text-dei-sage" : "bg-dei-rose/10 text-dei-rose"}`}>
                  {stat.trend}
                </span>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Enrollment Chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="lg:col-span-2 dei-card p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Student Enrollment</h3>
                <span className="text-xs text-muted-foreground">Last 7 months</span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={enrollmentData}>
                    <defs>
                      <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(152, 35%, 55%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(152, 35%, 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 92%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid hsl(220, 20%, 92%)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    />
                    <Area type="monotone" dataKey="students" stroke="hsl(152, 35%, 55%)" fill="url(#enrollGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="dei-card p-5"
            >
              <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.map((act, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-foreground leading-snug">{act.text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Courses Table */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="dei-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">My Courses</h3>
              <Button variant="outline" size="sm" className="rounded-xl text-xs">View All</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/50">
                    <th className="pb-3 font-medium">Course</th>
                    <th className="pb-3 font-medium">Students</th>
                    <th className="pb-3 font-medium">Rating</th>
                    <th className="pb-3 font-medium">Revenue</th>
                    <th className="pb-3 font-medium">Completion</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.title} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3.5">
                        <div>
                          <p className="font-medium text-foreground">{course.title}</p>
                          <p className="text-xs text-muted-foreground">{course.lessons} lessons</p>
                        </div>
                      </td>
                      <td className="py-3.5 tabular-nums">
                        <div className="flex items-center gap-1.5">
                          {course.students.toLocaleString()}
                          {course.trendValue && (
                            <span className={`text-xs ${course.trend === "up" ? "text-dei-sage" : "text-dei-rose"}`}>
                              {course.trendValue}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5">
                        {course.rating > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-dei-amber fill-dei-amber" />
                            <span className="tabular-nums">{course.rating}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3.5 tabular-nums font-medium">{course.revenue}</td>
                      <td className="py-3.5">
                        {course.completionRate > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-dei-sage rounded-full" style={{ width: `${course.completionRate}%` }} />
                            </div>
                            <span className="text-xs tabular-nums text-muted-foreground">{course.completionRate}%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${course.status === "Published" ? "bg-dei-sage/10 text-dei-sage" : "bg-muted text-muted-foreground"
                          }`}>
                          {course.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
