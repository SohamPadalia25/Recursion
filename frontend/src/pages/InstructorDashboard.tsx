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
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [courses, setCourses] = useState<Course[]>([]);

    useEffect(() => {
        let mounted = true;

        async function load() {
            setLoading(true);
            setError("");
            try {
                const data = await getInstructorCourses();
                if (mounted) setCourses(data || []);
            } catch (err) {
                if (mounted) setError(err instanceof Error ? err.message : "Failed to load instructor courses");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, []);

    const summary = useMemo(() => {
        const totalCourses = courses.length;
        const publishedCourses = courses.filter((course) => course.status === "published").length;
        const totalStudents = courses.reduce((sum, course) => sum + (course.enrollmentCount || 0), 0);
        const avgRating =
            totalCourses > 0
                ? (
                    courses.reduce((sum, course) => sum + (course.averageRating || 0), 0) / totalCourses
                ).toFixed(1)
                : "0.0";

        return { totalCourses, publishedCourses, totalStudents, avgRating };
    }, [courses]);

    const enrollmentData = useMemo(() => {
        return courses
            .slice()
            .sort((a, b) => {
                const aDate = new Date(a.createdAt || 0).getTime();
                const bDate = new Date(b.createdAt || 0).getTime();
                return aDate - bDate;
            })
            .map((course) => ({
                month: monthLabel(course.createdAt),
                students: course.enrollmentCount || 0,
            }));
    }, [courses]);

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

            <section className="mb-6 dei-card p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Enrollment by Course</h3>
                    <Button onClick={() => navigate("/instructor/course-builder")}>Create Course</Button>
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
