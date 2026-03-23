import { useEffect, useState } from "react";
import { AppFrame } from "@/components/platform/AppFrame";
import { instructorNav } from "../roleNav";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import { getInstructorCourses, type Course } from "@/lib/course-api";

type LessonDraft = {
    title: string;
    description: string;
    videoUrl: string;
    duration: string;
    isFree: boolean;
};

type ModuleDraft = {
    title: string;
    description: string;
    lessons: LessonDraft[];
};

const createEmptyLesson = (): LessonDraft => ({
    title: "",
    description: "",
    videoUrl: "",
    duration: "0",
    isFree: false,
});

const createEmptyModule = (): ModuleDraft => ({
    title: "",
    description: "",
    lessons: [createEmptyLesson()],
});

function validateStructure(modules: ModuleDraft[]) {
    if (!modules.length) return "Add at least one module.";

    for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex += 1) {
        const module = modules[moduleIndex];

        if (!module.title.trim()) {
            return `Module ${moduleIndex + 1} title is required.`;
        }

        if (!module.lessons.length) {
            return `Module ${moduleIndex + 1} must have at least one lesson.`;
        }

        for (let lessonIndex = 0; lessonIndex < module.lessons.length; lessonIndex += 1) {
            const lesson = module.lessons[lessonIndex];
            if (!lesson.title.trim()) {
                return `Lesson ${lessonIndex + 1} title is required in module ${moduleIndex + 1}.`;
            }
            if (!lesson.videoUrl.trim()) {
                return `Lesson ${lessonIndex + 1} video URL is required in module ${moduleIndex + 1}.`;
            }
        }
    }

    return "";
}

export default function InstructorCourseBuilderPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "",
        level: "beginner",
        language: "English",
        price: "0",
    });
    const [modules, setModules] = useState<ModuleDraft[]>([createEmptyModule()]);
    const [draggedModuleIndex, setDraggedModuleIndex] = useState<number | null>(null);
    const [dragOverModuleIndex, setDragOverModuleIndex] = useState<number | null>(null);
    const [draggedLesson, setDraggedLesson] = useState<{ moduleIndex: number; lessonIndex: number } | null>(null);
    const [dragOverLesson, setDragOverLesson] = useState<{ moduleIndex: number; lessonIndex: number } | null>(null);
    const structureError = validateStructure(modules);

    const loadCourses = async () => {
        setLoading(true);
        try {
            const data = await getInstructorCourses();
            setCourses(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load courses");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCourses();
    }, []);

    const createCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (structureError) {
            setError(structureError);
            return;
        }

        setSubmitting(true);

        try {
            await apiRequest("/api/v1/courses", {
                method: "POST",
                body: {
                    ...form,
                    price: Number(form.price || 0),
                    modules: modules.map((module) => ({
                            title: module.title.trim(),
                            description: module.description.trim(),
                            lessons: module.lessons.map((lesson) => ({
                                    title: lesson.title.trim(),
                                    description: lesson.description.trim(),
                                    videoUrl: lesson.videoUrl.trim(),
                                    duration: Number(lesson.duration || 0),
                                    isFree: lesson.isFree,
                                })),
                        })),
                },
            });

            setForm({
                title: "",
                description: "",
                category: "",
                level: "beginner",
                language: "English",
                price: "0",
            });
            setModules([createEmptyModule()]);

            await loadCourses();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create course");
        } finally {
            setSubmitting(false);
        }
    };

    const addModule = () => {
        setModules((prev) => [...prev, createEmptyModule()]);
    };

    const removeModule = (moduleIndex: number) => {
        setModules((prev) => prev.filter((_, index) => index !== moduleIndex));
    };

    const updateModuleField = (moduleIndex: number, field: "title" | "description", value: string) => {
        setModules((prev) => prev.map((module, index) => (index === moduleIndex ? { ...module, [field]: value } : module)));
    };

    const addLesson = (moduleIndex: number) => {
        setModules((prev) =>
            prev.map((module, index) =>
                index === moduleIndex
                    ? { ...module, lessons: [...module.lessons, createEmptyLesson()] }
                    : module,
            ),
        );
    };

    const removeLesson = (moduleIndex: number, lessonIndex: number) => {
        setModules((prev) =>
            prev.map((module, index) => {
                if (index !== moduleIndex) return module;
                const lessons = module.lessons.filter((_, idx) => idx !== lessonIndex);
                return { ...module, lessons: lessons.length ? lessons : [createEmptyLesson()] };
            }),
        );
    };

    const updateLessonField = (
        moduleIndex: number,
        lessonIndex: number,
        field: keyof LessonDraft,
        value: string | boolean,
    ) => {
        setModules((prev) =>
            prev.map((module, index) => {
                if (index !== moduleIndex) return module;
                const lessons = module.lessons.map((lesson, idx) =>
                    idx === lessonIndex ? { ...lesson, [field]: value } : lesson,
                );
                return { ...module, lessons };
            }),
        );
    };

    const moveModule = (from: number, to: number) => {
        if (from === to || from < 0 || to < 0 || from >= modules.length || to >= modules.length) {
            return;
        }

        setModules((prev) => {
            const reordered = [...prev];
            const [moved] = reordered.splice(from, 1);
            reordered.splice(to, 0, moved);
            return reordered;
        });
    };

    const onModuleDragStart = (moduleIndex: number) => {
        setDraggedModuleIndex(moduleIndex);
    };

    const onModuleDrop = (moduleIndex: number) => {
        if (draggedModuleIndex === null) return;
        moveModule(draggedModuleIndex, moduleIndex);
        setDraggedModuleIndex(null);
        setDragOverModuleIndex(null);
    };

    const moveLesson = (moduleIndex: number, from: number, to: number) => {
        if (from === to || from < 0 || to < 0) return;

        setModules((prev) =>
            prev.map((module, index) => {
                if (index !== moduleIndex) return module;
                if (from >= module.lessons.length || to >= module.lessons.length) return module;

                const reorderedLessons = [...module.lessons];
                const [movedLesson] = reorderedLessons.splice(from, 1);
                reorderedLessons.splice(to, 0, movedLesson);

                return { ...module, lessons: reorderedLessons };
            }),
        );
    };

    const onLessonDragStart = (moduleIndex: number, lessonIndex: number, e: React.DragEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setDraggedLesson({ moduleIndex, lessonIndex });
    };

    const onLessonDrop = (moduleIndex: number, lessonIndex: number, e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedLesson || draggedLesson.moduleIndex !== moduleIndex) {
            setDraggedLesson(null);
            setDragOverLesson(null);
            return;
        }

        moveLesson(moduleIndex, draggedLesson.lessonIndex, lessonIndex);
        setDraggedLesson(null);
        setDragOverLesson(null);
    };

    const submitForApproval = async (courseId: string) => {
        setError("");
        try {
            await apiRequest(`/api/v1/courses/${courseId}/submit`, {
                method: "PATCH",
            });
            await loadCourses();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit for approval");
        }
    };

    return (
        <AppFrame
            roleLabel="Instructor"
            title="Course Builder"
            subtitle="Create and submit courses directly to backend workflows."
            navItems={instructorNav}
        >
            {error ? (
                <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-3">
                <section className="lg:col-span-2 dei-card p-5">
                    <h2 className="mb-4 text-base font-semibold">Create New Course</h2>

                    <form onSubmit={createCourse} className="grid gap-3 md:grid-cols-2">
                        <input
                            value={form.title}
                            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="Course title"
                            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                            required
                        />
                        <input
                            value={form.category}
                            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                            placeholder="Category"
                            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                            required
                        />
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Description"
                            className="md:col-span-2 min-h-[96px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            required
                        />
                        <select
                            value={form.level}
                            onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
                            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                        >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                        <input
                            value={form.language}
                            onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))}
                            placeholder="Language"
                            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                        />
                        <input
                            type="number"
                            min="0"
                            value={form.price}
                            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                            placeholder="Price"
                            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                        />
                        <div className="md:col-span-2">
                            <Button type="submit" disabled={submitting || Boolean(structureError)}>
                                {submitting ? "Creating..." : "Create course"}
                            </Button>
                            {structureError ? <p className="mt-2 text-xs text-destructive">{structureError}</p> : null}
                        </div>

                        <div className="md:col-span-2 mt-2 space-y-4 rounded-xl border border-border/60 p-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-foreground">Modules and Lessons</h3>
                                <Button type="button" size="sm" variant="outline" onClick={addModule}>
                                    Add Module
                                </Button>
                            </div>

                            {modules.map((module, moduleIndex) => (
                                <div
                                    key={`module-${moduleIndex}`}
                                    className={`space-y-3 rounded-lg border p-3 transition-colors ${dragOverModuleIndex === moduleIndex ? "border-primary/60 bg-primary/5" : "border-border/60"}`}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragOverModuleIndex(moduleIndex);
                                    }}
                                    onDrop={() => onModuleDrop(moduleIndex)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="cursor-grab rounded border border-border px-2 py-1 text-xs text-muted-foreground active:cursor-grabbing"
                                                draggable
                                                onDragStart={() => onModuleDragStart(moduleIndex)}
                                                onDragEnd={() => {
                                                    setDraggedModuleIndex(null);
                                                    setDragOverModuleIndex(null);
                                                }}
                                            >
                                                Drag
                                            </div>
                                            <p className="text-sm font-medium text-foreground">Module {moduleIndex + 1}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeModule(moduleIndex)}
                                            disabled={modules.length === 1}
                                        >
                                            Remove
                                        </Button>
                                    </div>

                                    <input
                                        value={module.title}
                                        onChange={(e) => updateModuleField(moduleIndex, "title", e.target.value)}
                                        placeholder="Module title"
                                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                                    />

                                    <textarea
                                        value={module.description}
                                        onChange={(e) => updateModuleField(moduleIndex, "description", e.target.value)}
                                        placeholder="Module description"
                                        className="min-h-[72px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    />

                                    <div className="space-y-2 rounded-lg border border-dashed border-border/70 p-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lessons</p>
                                            <Button type="button" size="sm" variant="outline" onClick={() => addLesson(moduleIndex)}>
                                                Add Lesson
                                            </Button>
                                        </div>

                                        {module.lessons.map((lesson, lessonIndex) => (
                                            <div
                                                key={`lesson-${moduleIndex}-${lessonIndex}`}
                                                className={`grid gap-2 rounded-lg border p-3 md:grid-cols-2 ${dragOverLesson?.moduleIndex === moduleIndex && dragOverLesson?.lessonIndex === lessonIndex ? "border-primary/60 bg-primary/5" : "border-border/60"}`}
                                                draggable
                                                onDragStart={(e) => onLessonDragStart(moduleIndex, lessonIndex, e)}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setDragOverLesson({ moduleIndex, lessonIndex });
                                                }}
                                                onDrop={(e) => onLessonDrop(moduleIndex, lessonIndex, e)}
                                                onDragEnd={() => {
                                                    setDraggedLesson(null);
                                                    setDragOverLesson(null);
                                                }}
                                            >
                                                <input
                                                    value={lesson.title}
                                                    onChange={(e) => updateLessonField(moduleIndex, lessonIndex, "title", e.target.value)}
                                                    placeholder="Lesson title"
                                                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                                                />
                                                <input
                                                    value={lesson.videoUrl}
                                                    onChange={(e) => updateLessonField(moduleIndex, lessonIndex, "videoUrl", e.target.value)}
                                                    placeholder="Lesson video URL"
                                                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                                                />
                                                <textarea
                                                    value={lesson.description}
                                                    onChange={(e) => updateLessonField(moduleIndex, lessonIndex, "description", e.target.value)}
                                                    placeholder="Lesson description"
                                                    className="md:col-span-2 min-h-[64px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                                />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={lesson.duration}
                                                    onChange={(e) => updateLessonField(moduleIndex, lessonIndex, "duration", e.target.value)}
                                                    placeholder="Duration (seconds)"
                                                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                                                />
                                                <div className="flex items-center justify-between rounded-lg border border-border px-3">
                                                    <label className="text-sm text-muted-foreground" htmlFor={`lesson-free-${moduleIndex}-${lessonIndex}`}>
                                                        Free preview
                                                    </label>
                                                    <input
                                                        id={`lesson-free-${moduleIndex}-${lessonIndex}`}
                                                        type="checkbox"
                                                        checked={lesson.isFree}
                                                        onChange={(e) => updateLessonField(moduleIndex, lessonIndex, "isFree", e.target.checked)}
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => removeLesson(moduleIndex, lessonIndex)}
                                                    >
                                                        Remove Lesson
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </form>
                </section>

                <section className="dei-card p-5">
                    <h3 className="mb-3 text-base font-semibold">Course Workflow</h3>
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                        <li>Create course metadata.</li>
                        <li>Add modules and lessons.</li>
                        <li>Submit for admin approval.</li>
                    </ol>
                </section>
            </div>

            <section className="mt-6 dei-card p-5">
                <h3 className="mb-4 text-base font-semibold">My Courses</h3>

                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading courses...</p>
                ) : courses.length ? (
                    <div className="space-y-3">
                        {courses.map((course) => (
                            <div key={course._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                                <div>
                                    <p className="font-medium text-foreground">{course.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {course.category || "General"} • {course.status || "draft"} • {course.enrollmentCount || 0} students • {course.moduleCount || 0} modules • {course.lessonCount || 0} lessons
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => submitForApproval(course._id)}>
                                        Submit
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No courses yet.</p>
                )}
            </section>
        </AppFrame>
    );
}
