import { useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Users" },
  { icon: BookOpen, label: "Courses" },
  { icon: Shield, label: "Moderation" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Server, label: "System" },
  { icon: Settings, label: "Settings" },
];

const platformGrowth = [
  { month: "Jan", users: 2400, courses: 45 },
  { month: "Feb", users: 3100, courses: 52 },
  { month: "Mar", users: 4200, courses: 61 },
  { month: "Apr", users: 5800, courses: 74 },
  { month: "May", users: 7200, courses: 89 },
  { month: "Jun", users: 9400, courses: 108 },
  { month: "Jul", users: 12847, courses: 134 },
];

const userDistribution = [
  { name: "Students", value: 10234, color: "hsl(210, 70%, 65%)" },
  { name: "Instructors", value: 2180, color: "hsl(152, 35%, 55%)" },
  { name: "Admins", value: 43, color: "hsl(16, 80%, 68%)" },
  { name: "Suspended", value: 390, color: "hsl(220, 10%, 50%)" },
];

const categoryData = [
  { name: "Tech", courses: 48 },
  { name: "Design", courses: 22 },
  { name: "Business", courses: 18 },
  { name: "Science", courses: 28 },
  { name: "Arts", courses: 12 },
  { name: "Language", courses: 6 },
];

const recentUsers = [
  { name: "Ananya Patel", email: "ananya@email.com", role: "Student", status: "Active", joined: "2h ago", initials: "AP", gradient: "from-dei-peach to-dei-rose" },
  { name: "Rahul Verma", email: "rahul@email.com", role: "Instructor", status: "Pending", joined: "5h ago", initials: "RV", gradient: "from-dei-sky to-dei-lavender" },
  { name: "Sarah Kim", email: "sarah@email.com", role: "Student", status: "Active", joined: "8h ago", initials: "SK", gradient: "from-dei-sage to-dei-sky" },
  { name: "Dev Sharma", email: "dev@email.com", role: "Student", status: "Flagged", joined: "1d ago", initials: "DS", gradient: "from-dei-amber to-dei-peach" },
  { name: "Lisa Wong", email: "lisa@email.com", role: "Instructor", status: "Active", joined: "1d ago", initials: "LW", gradient: "from-dei-lavender to-dei-rose" },
];

const flaggedContent = [
  { title: "Inappropriate quiz content in 'Web Dev 101'", severity: "High", reporter: "Auto-detected", time: "1h ago" },
  { title: "Copyright claim on 'Design Systems' video", severity: "Medium", reporter: "User report", time: "3h ago" },
  { title: "Spam reviews on 'Python Basics'", severity: "Low", reporter: "Auto-detected", time: "6h ago" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function AdminDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeNav, setActiveNav] = useState(0);

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
          {sidebarItems.map((navItem, i) => (
            <motion.button
              key={navItem.label}
              onClick={() => setActiveNav(i)}
              whileTap={{ scale: 0.96 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 relative ${
                activeNav === i ? "bg-dei-lavender/15 text-dei-lavender" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {activeNav === i && (
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
          ))}
        </nav>

        <div className="p-2 border-t border-border/50">
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
            <p className="text-sm text-muted-foreground">Super Administrator</p>
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
            <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-muted/60 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-dei-lavender to-dei-rose flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">SA</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
            </button>
          </div>
        </motion.header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* Stats */}
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Users", value: "12,847", icon: Users, gradient: "dei-gradient-sky", color: "text-dei-sky", trend: "+847 this month" },
              { label: "Active Courses", value: "134", icon: BookOpen, gradient: "dei-gradient-sage", color: "text-dei-sage", trend: "+26 this month" },
              { label: "Platform Revenue", value: "₹4.2L", icon: DollarSign, gradient: "dei-gradient-amber", color: "text-dei-amber", trend: "+32% MoM" },
              { label: "Flagged Items", value: "7", icon: AlertTriangle, gradient: "dei-gradient-peach", color: "text-dei-peach", trend: "3 high priority" },
            ].map((stat) => (
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
                    <Pie data={userDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {userDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(220, 20%, 92%)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {userDistribution.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-medium tabular-nums">{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Courses by Category */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="dei-card p-5"
            >
              <h3 className="font-semibold text-foreground mb-4">Courses by Category</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 92%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(220, 20%, 92%)" }} />
                    <Bar dataKey="courses" fill="hsl(265, 45%, 68%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Flagged Content */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="dei-card p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Flagged Content</h3>
                <span className="text-xs text-dei-rose font-medium px-2 py-0.5 rounded-full bg-dei-rose/10">3 pending</span>
              </div>
              <div className="space-y-3">
                {flaggedContent.map((flag, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      flag.severity === "High" ? "text-destructive" : flag.severity === "Medium" ? "text-dei-amber" : "text-muted-foreground"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug">{flag.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          flag.severity === "High" ? "bg-destructive/10 text-destructive" : flag.severity === "Medium" ? "bg-dei-amber/10 text-dei-amber" : "bg-muted text-muted-foreground"
                        }`}>
                          {flag.severity}
                        </span>
                        <span className="text-xs text-muted-foreground">{flag.reporter} · {flag.time}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg flex-shrink-0">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Users Table */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="dei-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Recent Users</h3>
              <Button variant="outline" size="sm" className="rounded-xl text-xs">View All Users</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/50">
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Joined</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user.email} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${user.gradient} flex items-center justify-center`}>
                            <span className="text-xs font-bold text-primary-foreground">{user.initials}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.role === "Instructor" ? "bg-dei-sage/10 text-dei-sage" : "bg-dei-sky/10 text-dei-sky"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.status === "Active" ? "bg-dei-sage/10 text-dei-sage" :
                          user.status === "Pending" ? "bg-dei-amber/10 text-dei-amber" :
                          "bg-dei-rose/10 text-dei-rose"
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-muted-foreground">{user.joined}</td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </div>
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
