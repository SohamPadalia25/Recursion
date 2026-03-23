import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppFrame } from "@/components/platform/AppFrame";
import { Button } from "@/components/ui/button";
import { instructorNav } from "@/pages/roleNav";
import { getInstructorCourses, type Course } from "@/lib/course-api";
import { InstructorLiveSessionButton } from "@/components/dashboard/InstructorLiveSessionButton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function monthLabel(isoDate?: string) {
    if (!isoDate) return "N/A";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", { month: "short" });
}

export default function InstructorDashboard() {
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
    : "IN";

    return (
        <AppFrame
            roleLabel="Instructor"
            title="Instructor Dashboard"
            subtitle="Live overview of your courses and enrollments"
            navItems={instructorNav}
        >
            <div className="mb-6 max-w-md">
                <InstructorLiveSessionButton />
            </div>

            {error ? (
                <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
            ) : null}

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <article className="dei-card p-5">
                    <p className="text-sm text-muted-foreground">Total Courses</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{summary.totalCourses}</p>
                </article>
                <article className="dei-card p-5">
                    <p className="text-sm text-muted-foreground">Published Courses</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{summary.publishedCourses}</p>
                </article>
                <article className="dei-card p-5">
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{summary.totalStudents}</p>
                </article>
                <article className="dei-card p-5">
                    <p className="text-sm text-muted-foreground">Average Rating</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{summary.avgRating}</p>
                </article>
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
            <p className="text-sm text-muted-foreground">
              Welcome back, {user?.name ? user.name : "Instructor"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" className="rounded-xl gap-2 bg-dei-sage hover:bg-dei-sage/90">
              <Plus className="w-4 h-4" /> New Course
            </Button>
            <button className="relative w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-dei-rose rounded-full" />
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-muted/60 transition-colors"
              title="Open profile"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-dei-sage to-dei-sky flex items-center justify-center">
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

                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading analytics...</p>
                ) : (
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
                                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="students" stroke="hsl(152, 35%, 55%)" fill="url(#enrollGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </section>

            <section className="dei-card p-5">
                <h3 className="mb-4 font-semibold text-foreground">My Courses</h3>

                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading courses...</p>
                ) : courses.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50 text-left text-muted-foreground">
                                    <th className="pb-3 font-medium">Course</th>
                                    <th className="pb-3 font-medium">Status</th>
                                    <th className="pb-3 font-medium">Students</th>
                                    <th className="pb-3 font-medium">Rating</th>
                                    <th className="pb-3 font-medium">Reviews</th>
                                </tr>
                            </thead>
                            <tbody>
                                {courses.map((course) => (
                                    <tr key={course._id} className="border-b border-border/30 last:border-0">
                                        <td className="py-3.5">
                                            <div>
                                                <p className="font-medium text-foreground">{course.title}</p>
                                                <p className="text-xs text-muted-foreground">{course.category || "General"}</p>
                                            </div>
                                        </td>
                                        <td className="py-3.5">
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                                                {course.status || "draft"}
                                            </span>
                                        </td>
                                        <td className="py-3.5">{course.enrollmentCount || 0}</td>
                                        <td className="py-3.5">{(course.averageRating || 0).toFixed(1)}</td>
                                        <td className="py-3.5">{course.totalReviews || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No courses created yet.</p>
                )}
            </section>
        </AppFrame>
    );
}
