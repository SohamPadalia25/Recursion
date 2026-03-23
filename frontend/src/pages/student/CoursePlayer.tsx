import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ExternalLink, PlayCircle } from "lucide-react";
import { AppFrame } from "@/components/platform/AppFrame";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { studentNav } from "../roleNav";
import { getCourseDetail, getLessonDetail } from "@/lib/course-api";

export default function StudentCoursePlayerPage() {
    const { courseId, weekIdx, lectureIdx } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [courseData, setCourseData] = useState<Awaited<ReturnType<typeof getCourseDetail>> | null>(null);
    const [lessonData, setLessonData] = useState<Awaited<ReturnType<typeof getLessonDetail>> | null>(null);

    const moduleIndex = Number(weekIdx ?? 0);
    const lessonIndex = Number(lectureIdx ?? 0);

    useEffect(() => {
        let mounted = true;

        async function loadCourse() {
            if (!courseId) return;

            setLoading(true);
            setError("");

            try {
                const detail = await getCourseDetail(courseId);
                if (!mounted) return;
                setCourseData(detail);
            } catch (err) {
                if (!mounted) return;
                setError(err instanceof Error ? err.message : "Failed to load course player");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadCourse();

        return () => {
            mounted = false;
        };
    }, [courseId]);

    const activeLessonId = useMemo(() => {
        const module = courseData?.modules?.[moduleIndex];
        const lesson = module?.lessons?.[lessonIndex];
        return lesson?._id;
    }, [courseData, moduleIndex, lessonIndex]);

    useEffect(() => {
        let mounted = true;

        async function loadLesson() {
            if (!activeLessonId) {
                setLessonData(null);
                return;
            }

            try {
                const lesson = await getLessonDetail(activeLessonId);
                if (mounted) {
                    setLessonData(lesson);
                }
            } catch (err) {
                if (mounted) {
                    setLessonData(null);
                    setError(err instanceof Error ? err.message : "Failed to load lesson details");
                }
            }
        }

        loadLesson();

        return () => {
            mounted = false;
        };
    }, [activeLessonId]);

    const nextRoute = useMemo(() => {
        if (!courseData?.modules?.length) return null;

        const currentModule = courseData.modules[moduleIndex];
        if (!currentModule) return null;

        if (lessonIndex + 1 < currentModule.lessons.length) {
            return `/student/course/${courseData.course._id}/learn/${moduleIndex}/${lessonIndex + 1}`;
        }

        if (moduleIndex + 1 < courseData.modules.length && courseData.modules[moduleIndex + 1].lessons.length > 0) {
            return `/student/course/${courseData.course._id}/learn/${moduleIndex + 1}/0`;
        }

        return null;
    }, [courseData, moduleIndex, lessonIndex]);

    if (loading) {
        return (
            <AppFrame roleLabel="Student" title="Player" subtitle="Loading..." navItems={studentNav}>
                <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading video player...</div>
            </AppFrame>
        );
    }

    if (!courseData?.course) {
        return (
            <AppFrame roleLabel="Student" title="Player" subtitle="" navItems={studentNav}>
                <div className="rounded-xl border border-border bg-card p-6">
                    <p className="text-sm text-muted-foreground">{error || "Course not found"}</p>
                    <Button className="mt-4" onClick={() => navigate("/student/courses")}>Back to courses</Button>
                </div>
            </AppFrame>
        );
    }

    const activeModule = courseData.modules[moduleIndex];
    const activeLesson = activeModule?.lessons?.[lessonIndex];

    if (!activeModule || !activeLesson) {
        return (
            <AppFrame roleLabel="Student" title={courseData.course.title} subtitle="Invalid lesson" navItems={studentNav}>
                <div className="rounded-xl border border-border bg-card p-6">
                    <p className="text-sm text-muted-foreground">Lesson not found in this course.</p>
                    <Button className="mt-4" onClick={() => navigate(`/student/course/${courseData.course._id}`)}>Back to course</Button>
                </div>
            </AppFrame>
        );
    }

    return (
        <AppFrame
            roleLabel="Student"
            title={courseData.course.title}
            subtitle={`${activeModule.title} • ${activeLesson.title}`}
            navItems={studentNav}
        >
            {error ? (
                <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <section className="space-y-4 min-w-0">
                    <article className="overflow-hidden rounded-xl border border-border/90 bg-card shadow-sm">
                        <div className="relative aspect-video bg-black">
                            {lessonData?.videoUrl ? (
                                <video key={lessonData.videoUrl} controls className="h-full w-full" preload="metadata">
                                    <source src={lessonData.videoUrl} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                    <PlayCircle className="h-10 w-10" />
                                </div>
                            )}
                        </div>

                        <div className="border-t border-border px-4 py-3">
                            <h2 className="text-lg font-bold text-foreground">{activeLesson.title}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{activeLesson.duration || 0} seconds • {activeLesson.isFree ? "Free lesson" : "Enrolled lesson"}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                {nextRoute ? (
                                    <Button size="sm" className="rounded-lg" onClick={() => navigate(nextRoute)}>
                                        <CheckCircle2 className="mr-1 h-4 w-4" /> Mark complete & next
                                    </Button>
                                ) : null}
                                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => navigate(`/student/course/${courseData.course._id}`)}>
                                    Back to course
                                </Button>
                            </div>
                        </div>
                    </article>

                    {lessonData?.resources?.length ? (
                        <article className="rounded-xl border border-border bg-card p-4">
                            <h3 className="text-base font-semibold text-foreground">Lesson resources</h3>
                            <div className="mt-3 space-y-2">
                                {lessonData.resources.map((resource) => (
                                    <a
                                        key={`${resource.title}-${resource.url}`}
                                        href={resource.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
                                    >
                                        <span>{resource.title}</span>
                                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                    </a>
                                ))}
                            </div>
                        </article>
                    ) : null}
                </section>

                <aside className="rounded-xl border border-border/90 bg-card xl:sticky xl:top-24 self-start overflow-hidden shadow-sm">
                    <div className="border-b border-border px-4 py-3">
                        <h3 className="text-base font-bold text-foreground">Course content</h3>
                    </div>

                    <div className="max-h-[72vh] overflow-y-auto px-4 pb-3">
                        <Accordion type="multiple" defaultValue={[activeModule._id]}>
                            {courseData.modules.map((module, modIdx) => (
                                <AccordionItem key={module._id} value={module._id} className="border-border/80">
                                    <AccordionTrigger className="text-left text-sm font-semibold">
                                        <div>
                                            <p>{module.title}</p>
                                            <p className="text-xs text-muted-foreground font-normal">{module.lessons.length} lessons</p>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-1">
                                            {module.lessons.map((lesson, lesIdx) => {
                                                const isActive = modIdx === moduleIndex && lesIdx === lessonIndex;
                                                return (
                                                    <button
                                                        key={lesson._id}
                                                        type="button"
                                                        onClick={() => navigate(`/student/course/${courseData.course._id}/learn/${modIdx}/${lesIdx}`)}
                                                        className={`w-full rounded-lg border px-3 py-2 text-left ${isActive ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted/40"}`}
                                                    >
                                                        <p className="text-sm text-foreground">{lesson.title}</p>
                                                        <p className="mt-1 text-xs text-muted-foreground">{lesson.duration || 0} seconds</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </aside>
            </div>
        </AppFrame>
    );
}
