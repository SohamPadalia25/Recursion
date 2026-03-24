import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppFrame } from "@/components/platform/AppFrame";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
    checkEnrollmentStatus,
    createCourseReview,
    deleteCourseReview,
    getCourseReviews,
    enrollInCourse,
    getCourseDetail,
    getCourseProgress,
    type CourseReview,
    type CourseProgress,
} from "@/lib/course-api";
import { getCourseTopicQuizzes, type QuizBank } from "@/lib/quiz-api";
import { studentNav } from "../roleNav";

export default function StudentCourseDetailPage() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [enrolling, setEnrolling] = useState(false);
    const [courseData, setCourseData] = useState<Awaited<ReturnType<typeof getCourseDetail>> | null>(null);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [progress, setProgress] = useState<CourseProgress | null>(null);
    const [reviews, setReviews] = useState<CourseReview[]>([]);
    const [reviewsTotal, setReviewsTotal] = useState(0);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [deletingReview, setDeletingReview] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [courseQuizzes, setCourseQuizzes] = useState<QuizBank[]>([]);
    const [quizzesLoading, setQuizzesLoading] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function load() {
            if (!courseId) return;

            setLoading(true);
            setError("");

            try {
                const [detail, enrollmentStatus] = await Promise.all([
                    getCourseDetail(courseId),
                    checkEnrollmentStatus(courseId),
                ]);

                if (!mounted) return;

                setCourseData(detail);
                setIsEnrolled(enrollmentStatus?.isEnrolled || false);

                if (enrollmentStatus?.isEnrolled) {
                    try {
                        const p = await getCourseProgress(courseId);
                        if (mounted) setProgress(p);
                    } catch {
                        // Keep course view usable even if progress endpoint fails.
                    }
                }
            } catch (err) {
                if (!mounted) return;
                setError(err instanceof Error ? err.message : "Failed to load course details");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, [courseId]);

    useEffect(() => {
        if (!courseId) return;

        let mounted = true;

        const loadReviews = async () => {
            setReviewsLoading(true);
            try {
                const data = await getCourseReviews(courseId, 1, 20);
                if (!mounted) return;
                setReviews(data.reviews || []);
                setReviewsTotal(data.total || 0);
            } catch {
                if (!mounted) return;
                setReviews([]);
                setReviewsTotal(0);
            } finally {
                if (mounted) setReviewsLoading(false);
            }
        };

        loadReviews();

        return () => {
            mounted = false;
        };
    }, [courseId]);

    useEffect(() => {
        if (!courseId || !isEnrolled) {
            setCourseQuizzes([]);
            return;
        }

        let mounted = true;
        const loadQuizzes = async () => {
            setQuizzesLoading(true);
            try {
                const data = await getCourseTopicQuizzes(courseId);
                if (!mounted) return;
                setCourseQuizzes(data || []);
            } catch {
                if (!mounted) return;
                setCourseQuizzes([]);
            } finally {
                if (mounted) setQuizzesLoading(false);
            }
        };

        void loadQuizzes();
        return () => {
            mounted = false;
        };
    }, [courseId, isEnrolled]);

    const lessonCount = useMemo(() => {
        return (courseData?.modules || []).reduce((total, mod) => total + (mod.lessons?.length || 0), 0);
    }, [courseData]);

    const handleEnroll = async () => {
        if (!courseId) return;

        setEnrolling(true);
        setError("");

        try {
            await enrollInCourse(courseId);
            setIsEnrolled(true);
            const p = await getCourseProgress(courseId);
            setProgress(p);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Enrollment failed");
        } finally {
            setEnrolling(false);
        }
    };

    const refreshReviews = async () => {
        if (!courseId) return;
        const data = await getCourseReviews(courseId, 1, 20);
        setReviews(data.reviews || []);
        setReviewsTotal(data.total || 0);
    };

    const handleReviewSubmit = async () => {
        if (!courseId) return;

        setSubmittingReview(true);
        setError("");
        try {
            await createCourseReview(courseId, reviewRating, reviewComment.trim());
            setReviewComment("");
            await refreshReviews();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit review");
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleReviewDelete = async () => {
        if (!courseId) return;
        setDeletingReview(true);
        setError("");
        try {
            await deleteCourseReview(courseId);
            await refreshReviews();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete review");
        } finally {
            setDeletingReview(false);
        }
    };

    if (loading) {
        return (
            <AppFrame roleLabel="Student" title="Course" subtitle="Loading..." navItems={studentNav}>
                <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading course details...</div>
            </AppFrame>
        );
    }

    if (!courseData?.course) {
        return (
            <AppFrame roleLabel="Student" title="Course not found" subtitle="" navItems={studentNav}>
                <div className="rounded-xl border border-border bg-card p-6">
                    <p className="text-sm text-muted-foreground">{error || "Course does not exist."}</p>
                    <Button className="mt-4" onClick={() => navigate("/student/courses")}>Back to courses</Button>
                </div>
            </AppFrame>
        );
    }

    const { course, modules } = courseData;

    return (
        <AppFrame roleLabel="Student" title={course.title} subtitle={course.category || "Course details"} navItems={studentNav}>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="space-y-6 min-w-0">
                    {error ? (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
                    ) : null}

                    <article className="rounded-2xl border border-border bg-card p-6">
                        <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
                        <p className="mt-3 text-sm text-muted-foreground">{course.description}</p>

                        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span>Instructor: {course.instructor?.fullname || "Instructor"}</span>
                            <span>Level: {course.level || "beginner"}</span>
                            <span>Language: {course.language || "English"}</span>
                            <span>Rating: {(course.averageRating || 0).toFixed(1)}</span>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-border bg-card p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-foreground">Course content</h2>
                            <p className="text-sm text-muted-foreground">
                                {modules.length} modules • {lessonCount} lessons
                            </p>
                        </div>

                        <div className="mt-4 rounded-xl border border-border">
                            <Accordion type="multiple" className="px-4">
                                {modules.map((module) => (
                                    <AccordionItem value={module._id} key={module._id}>
                                        <AccordionTrigger className="text-left text-base font-semibold">
                                            {module.title}
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-2 pb-2">
                                                {(module.lessons || []).map((lesson, lessonIndex) => (
                                                    <div
                                                        key={lesson._id}
                                                        className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/student/course/${course._id}/learn/${module.order - 1}/${lessonIndex}`)}
                                                            className="text-left text-sm text-foreground hover:underline"
                                                        >
                                                            {lesson.title}
                                                        </button>
                                                        <span className="text-xs text-muted-foreground">
                                                            {lesson.duration || 0} mins {lesson.isFree ? "• Free" : ""}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-border bg-card p-6">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold text-foreground">Reviews</h2>
                            <p className="text-sm text-muted-foreground">{reviewsTotal} total</p>
                        </div>

                        {isEnrolled ? (
                            <div className="mt-4 rounded-xl border border-border/70 p-4">
                                <p className="text-sm font-medium text-foreground">Share your review</p>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <label className="text-sm text-muted-foreground">Rating</label>
                                    <select
                                        value={reviewRating}
                                        onChange={(e) => setReviewRating(Number(e.target.value))}
                                        className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                                    >
                                        {[5, 4, 3, 2, 1].map((n) => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>
                                </div>
                                <textarea
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    rows={3}
                                    placeholder="Write your review..."
                                    className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                />
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <Button size="sm" onClick={handleReviewSubmit} disabled={submittingReview}>
                                        {submittingReview ? "Saving..." : "Submit / Update Review"}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={handleReviewDelete} disabled={deletingReview}>
                                        {deletingReview ? "Deleting..." : "Delete My Review"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="mt-4 text-sm text-muted-foreground">Enroll in this course to add your review.</p>
                        )}

                        <div className="mt-4 space-y-3">
                            {reviewsLoading ? (
                                <p className="text-sm text-muted-foreground">Loading reviews...</p>
                            ) : reviews.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No reviews yet.</p>
                            ) : (
                                reviews.map((review) => (
                                    <div key={review._id} className="rounded-lg border border-border/70 p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-medium text-foreground">{review.student?.fullname || "Student"}</p>
                                            <p className="text-xs text-muted-foreground">{review.rating}/5</p>
                                        </div>
                                        {review.comment ? (
                                            <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                                        ) : null}
                                    </div>
                                ))
                            )}
                        </div>
                    </article>

                    {isEnrolled ? (
                        <article className="rounded-2xl border border-border bg-card p-6">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-lg font-semibold text-foreground">Topic Quizzes</h2>
                                <p className="text-sm text-muted-foreground">Unlock after topic completion</p>
                            </div>

                            <div className="mt-4 space-y-3">
                                {quizzesLoading ? (
                                    <p className="text-sm text-muted-foreground">Loading quizzes...</p>
                                ) : courseQuizzes.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No topic quizzes published yet for this course.</p>
                                ) : (
                                    courseQuizzes.map((quiz) => {
                                        const lessonTitle = quiz.lesson && typeof quiz.lesson === "object" ? quiz.lesson.title : "";
                                        return (
                                            <div key={quiz._id} className="rounded-lg border border-border/70 p-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{quiz.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {lessonTitle ? `Topic: ${lessonTitle}` : "Course-level quiz"}
                                                        </p>
                                                        {quiz.isUnlocked === false ? (
                                                            <p className="mt-1 text-xs text-amber-700">{quiz.lockReason || "Complete topic to unlock."}</p>
                                                        ) : null}
                                                        {quiz.hasPassed ? (
                                                            <p className="mt-1 text-xs text-emerald-700">
                                                                Passed{typeof quiz.bestPassedScore === "number" ? ` (${quiz.bestPassedScore}%)` : ""}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant={quiz.isUnlocked === false ? "outline" : "default"}
                                                        disabled={quiz.isUnlocked === false}
                                                        onClick={() => navigate(`/student/practice?courseId=${course._id}&quizId=${quiz._id}`)}
                                                    >
                                                        {quiz.hasPassed ? "Retake Quiz" : "Take Quiz"}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </article>
                    ) : null}
                </section>

                <aside className="self-start space-y-4 xl:sticky xl:top-24">
                    <article className="rounded-2xl border border-border bg-card p-5">
                        <div className="aspect-[16/9] overflow-hidden rounded-xl bg-muted">
                            <img
                                src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"}
                                alt={course.title}
                                className="h-full w-full object-cover"
                            />
                        </div>

                        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                            <p>Price: {course.price && course.price > 0 ? `INR ${course.price}` : "Free"}</p>
                            <p>Enrollments: {course.enrollmentCount || 0}</p>
                            <p>Status: {course.status || "draft"}</p>
                        </div>

                        {isEnrolled ? (
                            <Button className="mt-4 w-full" onClick={() => navigate("/student/progress")}>View Progress</Button>
                        ) : (
                            <Button className="mt-4 w-full" onClick={handleEnroll} disabled={enrolling}>
                                {enrolling ? "Enrolling..." : "Enroll now"}
                            </Button>
                        )}

                        {isEnrolled && progress ? (
                            <div className="mt-4 rounded-xl border border-border p-3 text-sm">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-muted-foreground">Completion</span>
                                    <span className="font-medium text-foreground">{progress.completionPercentage}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted">
                                    <div className="h-2 rounded-full bg-primary" style={{ width: `${progress.completionPercentage}%` }} />
                                </div>
                            </div>
                        ) : null}
                    </article>
                </aside>
            </div>
        </AppFrame>
    );
}
