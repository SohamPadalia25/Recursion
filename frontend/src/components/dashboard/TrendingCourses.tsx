import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Star, ChevronRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getMyEnrollments, getPublishedCourses, type Course, type Enrollment } from "@/lib/course-api";

export function TrendingCourses() {
    const navigate = useNavigate();
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);

    const selectedCourse = useMemo(() => {
        if (!selectedCourseId) return null;
        return courses.find((course) => course._id === selectedCourseId) || null;
    }, [courses, selectedCourseId]);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            try {
                const [published, mine] = await Promise.all([
                    getPublishedCourses({ limit: 8 }),
                    getMyEnrollments(),
                ]);
                if (!mounted) return;
                setCourses(published || []);
                setEnrollments(mine || []);
            } catch {
                if (!mounted) return;
                setCourses([]);
                setEnrollments([]);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        void load();
        return () => {
            mounted = false;
        };
    }, []);

    const enrolledIds = useMemo(
        () => new Set(enrollments.map((entry) => entry.course?._id).filter(Boolean)),
        [enrollments]
    );

    const onCourseClick = (courseId: string) => {
        if (selectedCourseId === courseId) {
            navigate(`/student/course/${courseId}`);
            return;
        }
        setSelectedCourseId(courseId);
    };

    return (
        <section className="space-y-5">
            <div className="dei-card p-3 md:p-3.5">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-base md:text-lg font-bold text-foreground">Recommended Courses</h2>
                        <p className="text-xs text-muted-foreground">Live catalog from your backend</p>
                    </div>
                    <Button variant="ghost" size="sm" className="rounded-xl text-xs whitespace-nowrap h-8 px-2.5" onClick={() => navigate("/student/courses")}>
                        Explore all <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>

                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading courses...</p>
                ) : null}
                {!loading && !courses.length ? (
                    <p className="text-sm text-muted-foreground">No published courses found.</p>
                ) : null}

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                    {courses.map((course, index) => {
                        const isSelected = selectedCourseId === course._id;

                        return (
                            <motion.article
                                key={course._id}
                                initial={{ opacity: 0, y: 18 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.35, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
                                whileHover={{ y: -3 }}
                                className="min-w-0 cursor-pointer"
                                onClick={() => onCourseClick(course._id)}
                            >
                                <div className={`overflow-hidden rounded-xl border bg-card transition-all duration-200 ${isSelected ? "border-primary shadow-md" : "border-border/70 shadow-sm hover:shadow-md"}`}>
                                    <div className="relative aspect-[16/9] bg-muted">
                                        <img
                                            src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"}
                                            alt={course.title}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>

                                    <div className="space-y-1 p-2.5">
                                        <h3 className="line-clamp-2 text-[0.82rem] md:text-[0.88rem] font-bold leading-snug text-foreground">{course.title}</h3>
                                        <p className="line-clamp-1 text-xs text-muted-foreground">{course.instructor?.fullname || "Instructor"}</p>

                                        <div className="flex items-center gap-1 text-[0.75rem] md:text-xs">
                                            <span className="font-semibold text-foreground">{(course.averageRating || 0).toFixed(1)}</span>
                                            <div className="flex items-center gap-0.5 text-dei-amber">
                                                {[0, 1, 2, 3, 4].map((star) => (
                                                    <Star key={`${course._id}-${star}`} className="h-2.5 w-2.5 fill-current" />
                                                ))}
                                            </div>
                                            <span className="text-muted-foreground">({course.totalReviews || 0})</span>
                                        </div>

                                        <div className="flex items-end gap-1.5">
                                            <span className="text-base md:text-lg leading-none font-bold text-foreground">
                                                {course.price && course.price > 0 ? `INR ${course.price}` : "Free"}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {enrolledIds.has(course._id) ? (
                                                <span className="rounded-md bg-dei-sage-light px-2.5 py-1 text-xs font-semibold text-dei-sage">Enrolled</span>
                                            ) : null}
                                            {course.level ? (
                                                <span className="rounded-md bg-dei-sky/15 px-2.5 py-1 text-xs font-semibold text-dei-sky">{course.level}</span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </motion.article>
                        );
                    })}
                </div>
            </div>

            {selectedCourse && (
                <motion.aside
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="dei-card p-5 md:p-6"
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <h3 className="text-2xl font-bold text-foreground leading-tight">{selectedCourse.title}</h3>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span className="rounded-md bg-dei-sky/15 px-2 py-1 text-dei-sky font-semibold">Live</span>
                                <span>Updated {selectedCourse.updatedAt ? new Date(selectedCourse.updatedAt).toLocaleDateString() : "recently"}</span>
                                <span>{selectedCourse.totalDuration || 0} mins</span>
                                <span>{selectedCourse.level || "beginner"}</span>
                            </div>
                            <p className="mt-4 text-base text-muted-foreground">{selectedCourse.description}</p>
                        </div>

                        <div>
                            <ul className="space-y-2">
                                {[
                                    `Instructor: ${selectedCourse.instructor?.fullname || "Instructor"}`,
                                    `Category: ${selectedCourse.category || "General"}`,
                                    `Lessons: ${selectedCourse.lessonCount || 0}`,
                                ].map((point) => (
                                    <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <Check className="mt-0.5 h-4 w-4 text-dei-sage" />
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-5 flex flex-wrap gap-2">
                                <Button onClick={() => navigate(`/student/course/${selectedCourse._id}`)} className="rounded-xl">
                                    Go to course page
                                </Button>
                                <Button variant="outline" onClick={() => setSelectedCourseId("")} className="rounded-xl">
                                    Close preview
                                </Button>
                            </div>
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">Tip: click the same course card again to open full course page directly.</p>
                </motion.aside>
            )}
        </section>
    );
}