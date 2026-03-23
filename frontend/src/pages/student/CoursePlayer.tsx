import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ExternalLink, PlayCircle, Save, Wrench } from "lucide-react";
import { AppFrame } from "@/components/platform/AppFrame";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getCourseById } from "@/data/udemyDemoCourses";
import { studentNav } from "../roleNav";

export default function StudentCoursePlayerPage() {
    const { courseId, weekIdx, lectureIdx } = useParams();
    const navigate = useNavigate();

    const weekIndex = Number(weekIdx ?? 0);
    const lessonIndex = Number(lectureIdx ?? 0);
    const course = useMemo(() => (courseId ? getCourseById(courseId) : undefined), [courseId]);

    const selectedLecture = useMemo(() => {
        if (!course) return null;
        const week = course.curriculum[weekIndex];
        if (!week) return null;
        return week.lectures[lessonIndex] ?? null;
    }, [course, weekIndex, lessonIndex]);

    const [isContentOpen, setIsContentOpen] = useState(true);
    const [noteText, setNoteText] = useState("");
    const [saveLabel, setSaveLabel] = useState("Save note");
    const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});
    const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);

    const completionStorageKey = useMemo(() => {
        if (!course) return "";
        return `dei-completion:${course.id}`;
    }, [course]);

    const lectureProgressKey = `${weekIndex}-${lessonIndex}`;

    const getNextLecture = () => {
        if (!course) return null;

        const currentWeek = course.curriculum[weekIndex];
        if (currentWeek && lessonIndex + 1 < currentWeek.lectures.length) {
            return { nextWeekIndex: weekIndex, nextLectureIndex: lessonIndex + 1 };
        }

        if (weekIndex + 1 < course.curriculum.length) {
            return { nextWeekIndex: weekIndex + 1, nextLectureIndex: 0 };
        }

        return null;
    };

    const notesStorageKey = useMemo(() => {
        if (!course) return "";
        return `dei-note:${course.id}:${weekIndex}:${lessonIndex}`;
    }, [course, weekIndex, lessonIndex]);

    useEffect(() => {
        if (!notesStorageKey) return;
        const existing = localStorage.getItem(notesStorageKey);
        setNoteText(existing ?? "");
        setSaveLabel("Save note");
    }, [notesStorageKey]);

    useEffect(() => {
        if (!completionStorageKey) return;
        const raw = localStorage.getItem(completionStorageKey);
        if (!raw) {
            setCompletedMap({});
            return;
        }

        try {
            const parsed = JSON.parse(raw) as Record<string, boolean>;
            setCompletedMap(parsed);
        } catch {
            setCompletedMap({});
        }
    }, [completionStorageKey]);

    useEffect(() => {
        if (autoNextCountdown === null || autoNextCountdown <= 0) return;
        const timer = window.setTimeout(() => {
            setAutoNextCountdown((prev) => (prev === null ? null : prev - 1));
        }, 1000);

        return () => window.clearTimeout(timer);
    }, [autoNextCountdown]);

    useEffect(() => {
        if (autoNextCountdown !== 0) return;
        const next = getNextLecture();
        if (next) {
            navigate(`/student/course/${course?.id}/learn/${next.nextWeekIndex}/${next.nextLectureIndex}`);
        }
        setAutoNextCountdown(null);
    }, [autoNextCountdown, course?.id, navigate]);

    const onSaveNote = () => {
        if (!notesStorageKey) return;
        localStorage.setItem(notesStorageKey, noteText);
        setSaveLabel("Saved");
        setTimeout(() => setSaveLabel("Save note"), 1200);
    };

    const toggleCompletion = (week: number, lecture: number) => {
        if (!completionStorageKey) return;
        const key = `${week}-${lecture}`;
        const nextMap = { ...completedMap, [key]: !completedMap[key] };
        setCompletedMap(nextMap);
        localStorage.setItem(completionStorageKey, JSON.stringify(nextMap));
    };

    const markCompleteAndGoNext = () => {
        toggleCompletion(weekIndex, lessonIndex);
        const next = getNextLecture();
        if (next) {
            navigate(`/student/course/${course.id}/learn/${next.nextWeekIndex}/${next.nextLectureIndex}`);
        }
    };

    if (!course || !selectedLecture) {
        return (
            <AppFrame roleLabel="Student" title="Lecture not found" subtitle="Choose a valid lecture from course content." navItems={studentNav}>
                <div className="dei-card p-6">
                    <p className="text-muted-foreground">Lecture does not exist for this course.</p>
                    <Button className="mt-4 rounded-xl" onClick={() => navigate("/student/courses")}>Back to My Courses</Button>
                </div>
            </AppFrame>
        );
    }

    return (
        <AppFrame
            roleLabel="Student"
            title={course.title}
            subtitle="Udemy-style learning player"
            navItems={studentNav}
        >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <section className="space-y-4 min-w-0">
                    <article className="overflow-hidden rounded-xl border border-border/90 bg-card shadow-sm">
                        <div className="relative aspect-video bg-muted">
                            <img src={course.image} alt={course.title} className="h-full w-full object-cover opacity-90" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="rounded-full bg-white/90 p-4">
                                    <PlayCircle className="h-9 w-9 text-foreground" />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-border px-4 py-3">
                            <h2 className="text-lg font-bold text-foreground">{selectedLecture.title}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{selectedLecture.duration} · {selectedLecture.preview ? "Free preview" : "Lecture"}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Button size="sm" className="rounded-lg" onClick={markCompleteAndGoNext}>
                                    <CheckCircle2 className="mr-1 h-4 w-4" /> Mark complete & next
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setAutoNextCountdown(3)}>
                                    Simulate video end
                                </Button>
                                {autoNextCountdown !== null && <span className="text-xs text-muted-foreground">Playing next in {autoNextCountdown}s...</span>}
                            </div>
                        </div>
                    </article>

                    <article className="dei-card border border-border/80 p-4">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-border bg-muted/40 p-1">
                                <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
                                <TabsTrigger value="notes" className="rounded-lg">Notes</TabsTrigger>
                                <TabsTrigger value="announcements" className="rounded-lg">Announcements</TabsTrigger>
                                <TabsTrigger value="reviews" className="rounded-lg">Reviews</TabsTrigger>
                                <TabsTrigger value="tools" className="rounded-lg">Learning tools</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="mt-4 rounded-xl border border-border/70 bg-card p-4">
                                <p className="text-sm text-muted-foreground">
                                    Use this lesson flow to learn by doing. Complete each section, then move to the next lecture from the curriculum panel.
                                </p>
                                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                                    <div className="rounded-lg border border-border p-3">Current week: <span className="font-semibold text-foreground">{course.curriculum[weekIndex]?.week}</span></div>
                                    <div className="rounded-lg border border-border p-3">Lecture time: <span className="font-semibold text-foreground">{selectedLecture.duration}</span></div>
                                    <div className="rounded-lg border border-border p-3">Mode: <span className="font-semibold text-foreground">{selectedLecture.preview ? "Preview" : "Enrolled"}</span></div>
                                </div>
                            </TabsContent>

                            <TabsContent value="notes" className="mt-4 rounded-xl border border-border/70 bg-card p-4">
                                <p className="mb-2 text-sm text-muted-foreground">Write notes for this lecture. Notes are saved on your device for this specific lecture.</p>
                                <Textarea
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder="Summarize key concepts, prompts, and implementation tips..."
                                    className="min-h-[180px] rounded-xl"
                                />
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">{noteText.length} characters</span>
                                    <Button className="rounded-lg" onClick={onSaveNote}>
                                        <Save className="mr-2 h-4 w-4" /> {saveLabel}
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="announcements" className="mt-4 rounded-xl border border-border/70 bg-card p-4">
                                <div className="space-y-3 text-sm">
                                    <div className="rounded-lg border border-border p-3">
                                        <p className="font-semibold text-foreground">New assignment released</p>
                                        <p className="mt-1 text-muted-foreground">Complete the Agent Creator mini-project before Sunday.</p>
                                    </div>
                                    <div className="rounded-lg border border-border p-3">
                                        <p className="font-semibold text-foreground">Live Q&A session</p>
                                        <p className="mt-1 text-muted-foreground">Join Friday at 7:30 PM for architecture walkthroughs.</p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="reviews" className="mt-4 rounded-xl border border-border/70 bg-card p-4">
                                <div className="space-y-3 text-sm">
                                    {[
                                        "Practical and project-focused. Loved the lecture flow.",
                                        "Clear explanation of agent orchestration concepts.",
                                        "Great pacing and very useful deployment examples.",
                                    ].map((review) => (
                                        <div key={review} className="rounded-lg border border-border p-3">
                                            <p className="font-semibold text-foreground">4.8 ★</p>
                                            <p className="mt-1 text-muted-foreground">{review}</p>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="tools" className="mt-4 rounded-xl border border-border/70 bg-card p-4">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-lg border border-border p-3">
                                        <p className="font-semibold text-foreground">Prompt Playground</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Test prompt variants quickly.</p>
                                    </div>
                                    <div className="rounded-lg border border-border p-3">
                                        <p className="font-semibold text-foreground">Resource Library</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Docs, templates, and examples.</p>
                                    </div>
                                    <div className="rounded-lg border border-border p-3">
                                        <p className="font-semibold text-foreground">Checklist</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Track project milestones.</p>
                                    </div>
                                    <div className="rounded-lg border border-border p-3">
                                        <p className="font-semibold text-foreground">Debug Assistant</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Get step-by-step fix hints.</p>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </article>
                </section>

                <aside className="rounded-xl border border-border/90 bg-card xl:sticky xl:top-24 self-start overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <h3 className="text-base font-bold text-foreground">Course content</h3>
                        <button
                            onClick={() => setIsContentOpen((prev) => !prev)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            {isContentOpen ? "Close" : "Open"}
                        </button>
                    </div>

                    {isContentOpen && <div className="max-h-[72vh] overflow-y-auto px-4 pb-3">
                        <Accordion type="multiple" defaultValue={[course.curriculum[weekIndex]?.week]}>
                            {course.curriculum.map((week, wIndex) => (
                                <AccordionItem key={week.week} value={week.week} className="border-border/80">
                                    <AccordionTrigger className="text-left text-sm font-semibold">
                                        <div>
                                            <p>{week.week}</p>
                                            <p className="text-xs text-muted-foreground font-normal">{week.lectures.length} lectures</p>
                                        </div>
                                    </AccordionTrigger>

                                    <AccordionContent>
                                        <div className="space-y-1">
                                            {week.lectures.map((lecture, lIndex) => {
                                                const isActive = wIndex === weekIndex && lIndex === lessonIndex;

                                                return (
                                                    <div
                                                        key={lecture.title}
                                                        className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors relative ${isActive ? "border-primary bg-primary/12 shadow-sm" : "border-transparent hover:bg-muted/50"}`}
                                                    >
                                                        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r bg-primary" />}

                                                        <div className="flex items-start gap-2">
                                                            <button
                                                                onClick={() => toggleCompletion(wIndex, lIndex)}
                                                                className={`mt-0.5 h-4 w-4 rounded-sm border ${completedMap[`${wIndex}-${lIndex}`] ? "bg-primary border-primary" : "border-muted-foreground/50"}`}
                                                                aria-label="Toggle lecture completion"
                                                            />

                                                            <button
                                                                onClick={() => navigate(`/student/course/${course.id}/learn/${wIndex}/${lIndex}`)}
                                                                className="min-w-0 flex-1 text-left"
                                                            >
                                                                <p className="line-clamp-2 text-sm text-foreground">{lecture.title}</p>
                                                                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                                                                    <span>{lecture.preview ? "Preview" : "Lecture"}</span>
                                                                    <span>{lecture.duration}</span>
                                                                </div>
                                                            </button>

                                                            {lecture.resources && lecture.resources.length > 0 && (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <button className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
                                                                            Resources
                                                                        </button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-56">
                                                                        {lecture.resources.map((resource) => (
                                                                            <DropdownMenuItem key={resource.label} asChild>
                                                                                <a href={resource.href} target="_blank" rel="noreferrer" className="flex items-center justify-between">
                                                                                    <span>{resource.label}</span>
                                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                                </a>
                                                                            </DropdownMenuItem>
                                                                        ))}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            )}
                                                        </div>

                                                        {isActive && (
                                                            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-primary">
                                                                <CheckCircle2 className="h-3.5 w-3.5" /> Current video
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>}

                    {!isContentOpen && (
                        <div className="px-4 py-4 text-xs text-muted-foreground">
                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                                <div className="flex items-center gap-2">
                                    <Wrench className="h-4 w-4" />
                                    Curriculum panel is hidden. Click Open to continue navigation.
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </AppFrame>
    );
}
