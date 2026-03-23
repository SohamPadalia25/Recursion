import { useEffect, useState } from "react";
import { AppFrame } from "@/components/platform/AppFrame";
import { adminNav } from "../roleNav";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import { getAdminCourses, getAdminStats } from "@/lib/course-api";

export default function AdminAnalyticsPage() {
    const [trendData, setTrendData] = useState<Array<{ month: string; users: number }>>([]);
    const [categoryData, setCategoryData] = useState<Array<{ name: string; courses: number }>>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const [stats, courses] = await Promise.all([
                    getAdminStats(),
                    getAdminCourses({ page: 1, limit: 200 }),
                ]);

                if (!mounted) return;

                setTrendData(
                    (stats.enrollmentTrend || []).map((item) => ({
                        month: item._id,
                        users: item.count,
                    }))
                );

                const categoryCounts = new Map<string, number>();
                for (const course of courses || []) {
                    const category = course.category || "Other";
                    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
                }

                setCategoryData(
                    Array.from(categoryCounts.entries()).map(([name, count]) => ({
                        name,
                        courses: count,
                    }))
                );
            } catch (err) {
                if (!mounted) return;
                setError(err instanceof Error ? err.message : "Failed to load analytics");
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <AppFrame
            roleLabel="Admin"
            title="Platform Analytics"
            subtitle="Monitor growth trends and system health in one place."
            navItems={adminNav}
        >
            {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

            <section className="dei-card p-5">
                <h2 className="mb-3 text-base font-semibold">Enrollment Trend</h2>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 92%)" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="users" stroke="hsl(265 45% 68%)" strokeWidth={3} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <section className="mt-6 dei-card p-5">
                <h2 className="mb-3 text-base font-semibold">Courses by Category</h2>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 92%)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="courses" fill="hsl(210 70% 65%)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>
        </AppFrame>
    );
}
