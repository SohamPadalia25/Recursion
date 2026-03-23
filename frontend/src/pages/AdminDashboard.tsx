import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Shield,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  ChevronDown,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  DollarSign,
  Activity,
  Server,
  Search,
  MoreHorizontal,
  Ban,
  CheckCircle2,
  Eye,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthContext";
import { getAdminStats } from "@/lib/user-api";
import {
    approveAdminCourse,
    getAdminCourses,
    getAdminStats,
    getAllUsers,
    getFlaggedChats,
    getPendingCourses,
    type AdminStats,
    type Course,
} from "@/lib/course-api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function AdminDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const initials = user?.name
    ? user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
    : "AD";
  const [adminStats, setAdminStats] = useState<Awaited<ReturnType<typeof getAdminStats>> | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    const token = user?.accessToken;
    if (!token) return;
    setStatsError(null);
    getAdminStats(token)
      .then(setAdminStats)
      .catch((err) => setStatsError(err instanceof Error ? err.message : "Failed to load admin stats"));
  }, [user?.accessToken]);

  const statsCards = adminStats
    ? [
        {
          label: "Total Users",
          value: adminStats.totalUsers.toLocaleString(),
          icon: Users,
          gradient: "dei-gradient-sky",
          color: "text-dei-sky",
          trend: `${adminStats.newUsers} new in 7d`,
        },
        {
          label: "Published Courses",
          value: adminStats.publishedCourses.toLocaleString(),
          icon: BookOpen,
          gradient: "dei-gradient-sage",
          color: "text-dei-sage",
          trend: `${adminStats.pendingApproval} pending`,
        },
        {
          label: "Total Enrollments",
          value: adminStats.totalEnrollments.toLocaleString(),
          icon: DollarSign,
          gradient: "dei-gradient-amber",
          color: "text-dei-amber",
          trend: "platform activity",
        },
        {
          label: "Flagged Items",
          value: (adminStats.flaggedChats + adminStats.flaggedReviews).toLocaleString(),
          icon: AlertTriangle,
          gradient: "dei-gradient-peach",
          color: "text-dei-peach",
          trend: "needs review",
        },
      ]
    : [
        { label: "Total Users", value: "12,847", icon: Users, gradient: "dei-gradient-sky", color: "text-dei-sky", trend: "+847 this month" },
        { label: "Active Courses", value: "134", icon: BookOpen, gradient: "dei-gradient-sage", color: "text-dei-sage", trend: "+26 this month" },
        { label: "Platform Revenue", value: "₹4.2L", icon: DollarSign, gradient: "dei-gradient-amber", color: "text-dei-amber", trend: "+32% MoM" },
        { label: "Flagged Items", value: "7", icon: AlertTriangle, gradient: "dei-gradient-peach", color: "text-dei-peach", trend: "3 high priority" },
      ];

  const computedUserDistribution = adminStats
    ? [
        { name: "Students", value: adminStats.totalStudents, color: "hsl(210, 70%, 65%)" },
        { name: "Instructors", value: adminStats.totalInstructors, color: "hsl(152, 35%, 55%)" },
        { name: "Admins", value: Math.max(0, adminStats.totalUsers - adminStats.totalStudents - adminStats.totalInstructors), color: "hsl(16, 80%, 68%)" },
        { name: "Suspended", value: 0, color: "hsl(220, 10%, 50%)" },
      ]
    : userDistribution;

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
            <div className="w-9 h-9 rounded-xl bg-dei-lavender flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-sm tracking-tight text-foreground whitespace-nowrap">
                Super Admin
              </motion.span>
            )}
          </motion.div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {sidebarItems.map((navItem) => {
            const isActive = navItem.to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(navItem.to);

            return (
              <motion.button
                key={navItem.label}
                onClick={() => navigate(navItem.to)}
                whileTap={{ scale: 0.96 }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 relative ${isActive ? "bg-dei-lavender/15 text-dei-lavender" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="admin-sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-dei-lavender rounded-r-full"
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
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-20"
        >
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">Platform Overview</h1>
            <p className="text-sm text-muted-foreground">{user?.name ? `${user.name}` : "Super Administrator"}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search users, courses..."
                className="w-64 h-9 pl-9 pr-4 rounded-xl bg-muted/60 border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-dei-lavender/30 transition-all"
              />
            </div>
            <button className="relative w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-muted/60 transition-colors"
              title="Open profile"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-dei-lavender to-dei-rose flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">{initials}</span>
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
          {/* Stats */}
          {statsError && <p className="text-sm text-destructive mb-3">{statsError}</p>}
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statsCards.map((stat) => (
              <motion.div key={stat.label} variants={item} whileHover={{ y: -2, transition: { duration: 0.2 } }} className="dei-card p-5 cursor-default">
                <div className="flex items-center gap-4 mb-3">
                  <div className={`w-12 h-12 rounded-2xl ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{stat.trend}</p>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Growth Chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="lg:col-span-2 dei-card p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Platform Growth</h3>
                <span className="text-xs text-muted-foreground">Last 7 months</span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={platformGrowth}>
                    <defs>
                      <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(265, 45%, 68%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(265, 45%, 68%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 92%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(220, 20%, 92%)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                    <Area type="monotone" dataKey="users" stroke="hsl(265, 45%, 68%)" fill="url(#adminGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* User Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="dei-card p-5"
            >
              <h3 className="font-semibold text-foreground mb-4">User Distribution</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={computedUserDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {computedUserDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(220, 20%, 92%)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {computedUserDistribution.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                </section>

                <section className="dei-card p-5">
                    <h3 className="mb-4 font-semibold text-foreground">Courses by Category</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 92%)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar dataKey="courses" fill="hsl(265, 45%, 68%)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="dei-card p-5">
                    <h3 className="mb-4 font-semibold text-foreground">Pending Course Approvals</h3>

                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading moderation queue...</p>
                    ) : pendingCourses.length ? (
                        <div className="space-y-3">
                            {pendingCourses.slice(0, 6).map((course) => (
                                <div key={course._id} className="rounded-xl border border-border p-3">
                                    <p className="font-medium text-foreground">{course.title}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {course.instructor?.fullname || "Instructor"} • {course.category || "General"}
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        <Button size="sm" onClick={() => approveCourse(course._id, true)}>Approve</Button>
                                        <Button size="sm" variant="outline" onClick={() => approveCourse(course._id, false)}>Reject</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No pending courses.</p>
                    )}
                </section>

                <section className="dei-card p-5">
                    <h3 className="mb-4 font-semibold text-foreground">Flagged AI Chats</h3>
                    {flaggedChats.length ? (
                        <div className="space-y-3">
                            {flaggedChats.slice(0, 6).map((chat) => (
                                <div key={chat._id} className="rounded-xl border border-border p-3">
                                    <p className="text-sm text-foreground">{chat.course?.title || "Unknown course"}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {chat.student?.fullname || "Unknown student"} • {chat.flagReason || "Flagged for review"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No flagged chats.</p>
                    )}
                </section>
            </div>

            <section className="dei-card p-5">
                <h3 className="mb-4 font-semibold text-foreground">Recent Users</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/50 text-left text-muted-foreground">
                                <th className="pb-3 font-medium">Name</th>
                                <th className="pb-3 font-medium">Email</th>
                                <th className="pb-3 font-medium">Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentUsers.map((user) => (
                                <tr key={user._id} className="border-b border-border/30 last:border-0">
                                    <td className="py-3.5">{user.fullname}</td>
                                    <td className="py-3.5">{user.email}</td>
                                    <td className="py-3.5 capitalize">{user.role}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </AppFrame>
    );
}
