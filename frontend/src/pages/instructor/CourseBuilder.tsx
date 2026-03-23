import { useEffect, useState } from "react";
import { AppFrame } from "@/components/platform/AppFrame";
import { instructorNav } from "../roleNav";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import { getInstructorCourses, type Course } from "@/lib/course-api";

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
        setSubmitting(true);

        try {
            await apiRequest("/api/v1/courses", {
                method: "POST",
                body: {
                    ...form,
                    price: Number(form.price || 0),
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

            await loadCourses();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create course");
        } finally {
            setSubmitting(false);
        }
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
                            <Button type="submit" disabled={submitting}>
                                {submitting ? "Creating..." : "Create course"}
                            </Button>
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
                                        {course.category || "General"} • {course.status || "draft"} • {course.enrollmentCount || 0} students
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
