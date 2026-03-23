import { useEffect, useMemo, useState } from "react";
import { AppFrame } from "@/components/platform/AppFrame";
import { adminNav } from "@/pages/roleNav";
import { Button } from "@/components/ui/button";
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [pendingCourses, setPendingCourses] = useState<Course[]>([]);
    const [recentUsers, setRecentUsers] = useState<Array<{ _id: string; fullname: string; email: string; role: string }>>([]);
    const [flaggedChats, setFlaggedChats] = useState<Array<{ _id: string; flagReason?: string; student?: { fullname?: string }; course?: { title?: string } }>>([]);

    const loadData = async () => {
        setLoading(true);
        setError("");

        try {
            const [statsData, courseData, pendingData, usersData, flaggedData] = await Promise.all([
                getAdminStats(),
                getAdminCourses({ page: 1, limit: 200 }),
                getPendingCourses(),
                getAllUsers({ page: 1, limit: 5 }),
                getFlaggedChats(),
            ]);

            setStats(statsData);
            setCourses(courseData || []);
            setPendingCourses(pendingData || []);
            setRecentUsers((usersData?.users || []) as any);
            setFlaggedChats((flaggedData || []) as any);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load admin dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const categoryData = useMemo(() => {
        const counts = new Map<string, number>();
        for (const course of courses) {
            const key = course.category || "Other";
            counts.set(key, (counts.get(key) || 0) + 1);
        }

        return Array.from(counts.entries()).map(([name, count]) => ({ name, courses: count }));
    }, [courses]);

    const approveCourse = async (courseId: string, approve: boolean) => {
        try {
            await approveAdminCourse(courseId, approve);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update course approval");
        }
    };

    return (
        <AppFrame roleLabel="Admin" title="Platform Overview" subtitle="Live control center for courses and users" navItems={adminNav}>
            {error ? (
                <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
            ) : null}

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <article className="dei-card p-5">
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{stats?.totalUsers || 0}</p>
                </article>
                <article className="dei-card p-5">
                    <p className="text-sm text-muted-foreground">Total Courses</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{stats?.totalCourses || 0}</p>
                </article>
                <article className="dei-card p-5">
                    <p className="text-sm text-muted-foreground">Published Courses</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{stats?.publishedCourses || 0}</p>
                </article>
                <article className="dei-card p-5">
                    <p className="text-sm text-muted-foreground">Pending Approvals</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{stats?.pendingApproval || 0}</p>
                </article>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="dei-card p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">Enrollment Trend (7 days)</h3>
                        <span className="text-xs text-muted-foreground">From admin stats</span>
                    </div>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.enrollmentTrend || []}>
                                <defs>
                                    <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(265, 45%, 68%)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(265, 45%, 68%)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 92%)" />
                                <XAxis dataKey="_id" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="count" stroke="hsl(265, 45%, 68%)" fill="url(#adminGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
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
