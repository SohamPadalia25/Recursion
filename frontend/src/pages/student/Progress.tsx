import { useEffect, useMemo, useState } from "react";
import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import { getCourseProgress, getMyEnrollments } from "@/lib/course-api";

export default function StudentProgressPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lineData, setLineData] = useState<Array<{ day: string; xp: number }>>([]);
    const [barData, setBarData] = useState<Array<{ topic: string; score: number }>>([]);
    const [summary, setSummary] = useState({
        completedLessons: 0,
        totalLessons: 0,
        completionPercentage: 0,
        watchedSeconds: 0,
        totalWatchableSeconds: 0,
        watchProgressPercentage: 0,
    });

    useEffect(() => {
        let mounted = true;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const enrollments = await getMyEnrollments();
                const courseIds = (enrollments || []).map((entry) => entry.course?._id).filter(Boolean);

                const progressList = await Promise.all(
                    courseIds.map(async (courseId) => {
                        try {
                            return await getCourseProgress(courseId);
                        } catch {
                            return null;
                        }
                    })
                );

                if (!mounted) return;

                const valid = progressList.filter(Boolean);
                const totalLessons = valid.reduce((sum, item) => sum + (item?.totalLessons || 0), 0);
                const completedLessons = valid.reduce((sum, item) => sum + (item?.completedLessons || 0), 0);
                const completionPercentage = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
                const watchedSeconds = valid.reduce((sum, item) => sum + Number(item?.watchedSeconds || 0), 0);
                const totalWatchableSeconds = valid.reduce((sum, item) => sum + Number(item?.totalLessonDurationSeconds || 0), 0);
                const watchProgressPercentage = totalWatchableSeconds
                    ? Math.round((watchedSeconds / totalWatchableSeconds) * 100)
                    : completionPercentage;

                setSummary({
                    completedLessons,
                    totalLessons,
                    completionPercentage,
                    watchedSeconds,
                    totalWatchableSeconds,
                    watchProgressPercentage,
                });

                setBarData(
                    (enrollments || []).map((entry, idx) => ({
                        topic: entry.course?.title ? entry.course.title.slice(0, 14) : `Course ${idx + 1}`,
                        score: entry.completionPercentage || 0,
                    }))
                );

                // Build real daily progression from completed lesson timestamps (last 7 days).
                const completionEvents = valid
                    .flatMap((item) => item?.lessons || [])
                    .filter((lesson) => lesson?.isCompleted)
                    .map((lesson) => {
                        const completedAt = lesson?.progress?.completedAt || lesson?.progress?.lastWatchedAt;
                        return completedAt ? new Date(completedAt) : null;
                    })
                    .filter((d): d is Date => Boolean(d));

                const dailyCount = new Map<string, number>();
                completionEvents.forEach((date) => {
                    const key = date.toDateString();
                    dailyCount.set(key, (dailyCount.get(key) || 0) + 1);
                });

                const days = Array.from({ length: 7 }).map((_, idx) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - idx));
                    const key = d.toDateString();
                    return {
                        day: d.toLocaleDateString(undefined, { weekday: "short" }),
                        xp: dailyCount.get(key) || 0,
                    };
                });

                setLineData(days);
            } catch (err) {
                if (!mounted) return;
                setError(err instanceof Error ? err.message : "Failed to load progress");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, []);

    const hasData = useMemo(() => barData.length > 0, [barData]);

    return (
        <AppFrame
            roleLabel="Student"
            title="Progress Tracking"
            subtitle="Visualize live completion and mastery from your enrolled courses."
            navItems={studentNav}
        >
            {error ? (
                <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
            ) : null}

            <div className="mb-6 dei-card p-5">
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Overall watch progress</p>
                    <p className="text-sm font-semibold text-foreground">
                        {summary.watchedSeconds}s / {summary.totalWatchableSeconds}s watched
                    </p>
                </div>
                <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${summary.watchProgressPercentage}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                    Lessons completed: {summary.completedLessons}/{summary.totalLessons} ({summary.completionPercentage}%)
                </p>
            </div>

            {loading ? (
                <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Loading progress...</div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="dei-card p-5">
                    <h2 className="mb-3 text-base font-semibold">Learning Over Time</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 92%)" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="xp" stroke="hsl(16 80% 68%)" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <section className="dei-card p-5">
                    <h2 className="mb-3 text-base font-semibold">Course Completion</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 92%)" />
                                <XAxis dataKey="topic" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar dataKey="score" fill="hsl(210 70% 65%)" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>

            {!loading && !hasData ? (
                <div className="mt-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                    No enrolled course progress found yet.
                </div>
            ) : null}
        </AppFrame>
    );
}
