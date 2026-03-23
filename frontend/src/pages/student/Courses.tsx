import { useEffect, useMemo, useState } from "react";
import { Clock3, Flame, Info, MoreVertical, PlayCircle, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AppFrame } from "@/components/platform/AppFrame";
import { Button } from "@/components/ui/button";
import { enrollInCourse, getMyLearning, getPublishedCourses, type Course, type Enrollment } from "@/lib/course-api";
import { studentNav } from "../roleNav";

const learningTabs = ["All courses", "My Lists", "Wishlist", "Archived", "Learning tools"];

export default function StudentCoursesPage() {
    const navigate = useNavigate();
    const [tab, setTab] = useState(learningTabs[0]);
    const [myLearning, setMyLearning] = useState<Enrollment[]>([]);
    const [discoverCourses, setDiscoverCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const [learning, published] = await Promise.all([
                    getMyLearning(),
                    getPublishedCourses({ limit: 24 }),
                ]);

                if (!mounted) return;

                setMyLearning(learning || []);
                setDiscoverCourses(published || []);
            } catch (err) {
                if (!mounted) return;
                setError(err instanceof Error ? err.message : "Failed to load courses");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, []);

    const enrolledCourseIds = useMemo(
        () => new Set(myLearning.map((entry) => entry.course?._id).filter(Boolean)),
        [myLearning]
    );

    const visibleCourses = useMemo(() => {
        if (tab === "All courses") {
            return discoverCourses;
        }

        if (tab === "My Lists") {
            return myLearning.map((entry) => entry.course).filter(Boolean);
        }

        return discoverCourses;
    }, [tab, discoverCourses, myLearning]);

    const handleEnroll = async (courseId: string) => {
        try {
            await enrollInCourse(courseId);
            const learning = await getMyLearning();
            setMyLearning(learning || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Enrollment failed");
        }
    };

    const toPriceLabel = (price?: number) => {
        if (!price || price <= 0) return "Free";
        return `INR ${price}`;
    };

    return (
        <AppFrame
            roleLabel="Student"
            title="My learning"
            subtitle=""
            navItems={studentNav}
        >
            <section className="border-b border-border">
                <div className="flex gap-6 overflow-x-auto pb-3">
                    {learningTabs.map((tabName) => (
                        <button
                            key={tabName}
                            onClick={() => setTab(tabName)}
                            className={`whitespace-nowrap pb-2 text-sm transition-colors ${tab === tabName
                                ? "border-b-2 border-foreground font-semibold text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                            type="button"
                        >
                            {tabName}
                        </button>
                    ))}
                </div>
            </section>

            <div className="mt-6 space-y-5">
                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-2xl border border-border bg-card p-6"
                >
                    <div className="grid gap-5 lg:grid-cols-[1.3fr_0.8fr_1fr] lg:items-center">
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">Start a weekly streak</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Let&apos;s chip away at your learning goals.</p>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl border border-border p-4">
                            <Flame className="h-6 w-6 text-muted-foreground" />
                            <div>
                                <p className="text-2xl font-semibold leading-none text-foreground">
                                    0 <span className="text-base font-medium text-muted-foreground">weeks</span>
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">Current streak</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 rounded-xl border border-border p-4">
                            <div className="relative h-14 w-14 rounded-full border-[7px] border-muted">
                                <div className="absolute inset-[6px] rounded-full border-4 border-emerald-500" />
                            </div>
                            <div className="space-y-1 text-sm">
                                <p className="text-foreground">0/30 course min</p>
                                <p className="text-foreground">1/1 visit</p>
                                <p className="text-muted-foreground">Mar 23 - 30</p>
                            </div>
                            <Info className="ml-auto h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.06 }}
                    className="rounded-2xl border border-border bg-card p-6"
                >
                    <div className="flex items-start gap-4">
                        <div className="rounded-full border border-border p-2 text-muted-foreground">
                            <Clock3 className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Schedule learning time</h3>
                            <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
                                Learning a little each day adds up. Research shows that students who make learning a habit are more
                                likely to reach their goals. Set time aside to learn and get reminders using your learning scheduler.
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                                >
                                    Get started
                                </button>
                                <button type="button" className="text-sm font-medium text-foreground/80 hover:text-foreground">
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.section>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {loading ? (
                        <div className="col-span-full rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                            Loading courses...
                        </div>
                    ) : null}

                    {error ? (
                        <div className="col-span-full rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                            {error}
                        </div>
                    ) : null}

                    {!loading && !visibleCourses.length ? (
                        <div className="col-span-full rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                            No courses found for this tab.
                        </div>
                    ) : null}

                    {visibleCourses.map((course, i) => {
                        const courseId = course._id;
                        const isEnrolled = enrolledCourseIds.has(courseId);

                        return (
                            <motion.article
                                key={courseId}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="min-w-0"
                            >
                                <div className="overflow-hidden rounded-lg border border-border bg-card">
                                    <div className="relative aspect-[16/9] w-full border-b border-border bg-muted/40">
                                        <img src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"} alt={course.title} className="h-full w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/student/course/${courseId}`)}
                                            className="absolute inset-0 bg-black/0 transition-colors hover:bg-black/10"
                                            aria-label="Open course details"
                                        />
                                        <span className="absolute left-2 bottom-2 rounded-md bg-card/85 px-2 py-1 text-[11px] text-foreground">
                                            {(course.averageRating || 0).toFixed(1)} ★ · {course.totalDuration || 0} mins
                                        </span>
                                        <button
                                            type="button"
                                            className="absolute right-2 top-2 rounded-md bg-card/80 p-1.5 text-muted-foreground hover:text-foreground"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="p-4">
                                        <button type="button" onClick={() => navigate(`/student/course/${courseId}`)} className="text-left">
                                            <h4 className="line-clamp-2 text-base font-semibold text-foreground hover:underline">{course.title}</h4>
                                        </button>
                                        <p className="mt-1 text-sm text-muted-foreground">{course.instructor?.fullname || "Instructor"}</p>
                                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                            <Star className="h-3.5 w-3.5 fill-dei-amber text-dei-amber" />
                                            <span>{(course.averageRating || 0).toFixed(1)}</span>
                                            <span>({course.totalReviews || 0})</span>
                                        </div>
                                        <div className="mt-2 text-sm font-semibold text-foreground">{toPriceLabel(course.price)}</div>
                                        <div className="mt-3 flex gap-2 border-t border-border pt-3">
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-8 rounded-lg px-3 text-xs"
                                                onClick={() => navigate(`/student/course/${courseId}`)}
                                            >
                                                <PlayCircle className="mr-1 h-3.5 w-3.5" /> {isEnrolled ? "Continue" : "Open"}
                                            </Button>
                                            {isEnrolled ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 rounded-lg px-3 text-xs"
                                                    onClick={() => navigate(`/student/course/${courseId}`)}
                                                >
                                                    View
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 rounded-lg px-3 text-xs"
                                                    onClick={() => handleEnroll(courseId)}
                                                >
                                                    Enroll
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.article>
                        )
                    })}
                </div>
            </div>
        </AppFrame>
    );
}
