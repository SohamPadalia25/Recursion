import { useEffect, useState } from "react";
import { AppFrame } from "@/components/platform/AppFrame";
import { adminNav } from "../roleNav";
import { Button } from "@/components/ui/button";
import { approveAdminCourse, getFlaggedChats, getPendingCourses, type Course } from "@/lib/course-api";

export default function AdminModerationPage() {
    const [pendingCourses, setPendingCourses] = useState<Course[]>([]);
    const [flaggedChats, setFlaggedChats] = useState<Array<{ _id: string; course?: { title?: string }; student?: { fullname?: string }; flagReason?: string }>>([]);
    const [error, setError] = useState("");

    const loadData = async () => {
        try {
            const [pending, flagged] = await Promise.all([getPendingCourses(), getFlaggedChats()]);
            setPendingCourses(pending || []);
            setFlaggedChats((flagged || []) as any);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load moderation queue");
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleApprove = async (courseId: string, approve: boolean) => {
        try {
            await approveAdminCourse(courseId, approve);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update course");
        }
    };

    return (
        <AppFrame
            roleLabel="Admin"
            title="Moderation"
            subtitle="Resolve flagged content and keep quality standards high."
            navItems={adminNav}
        >
            {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

            <section className="dei-card p-5">
                <h2 className="mb-4 text-base font-semibold">Pending Course Approvals</h2>
                <div className="space-y-3">
                    {pendingCourses.map((course) => (
                        <div key={course._id} className="rounded-xl border border-border bg-card p-4">
                            <p className="text-sm text-foreground">{course.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{course.instructor?.fullname || "Instructor"} • {course.category || "General"}</p>
                            <div className="mt-3 flex gap-2">
                                <Button size="sm" className="rounded-lg" onClick={() => handleApprove(course._id, true)}>Approve</Button>
                                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleApprove(course._id, false)}>Reject</Button>
                            </div>
                        </div>
                    ))}
                    {!pendingCourses.length ? <p className="text-sm text-muted-foreground">No pending courses.</p> : null}
                </div>
            </section>

            <section className="mt-6 dei-card p-5">
                <h2 className="mb-4 text-base font-semibold">Flagged AI Chats</h2>
                <div className="space-y-3">
                    {flaggedChats.map((item) => (
                        <div key={item._id} className="rounded-xl border border-border bg-card p-4">
                            <p className="text-sm text-foreground">{item.course?.title || "Unknown course"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.student?.fullname || "Unknown student"} • {item.flagReason || "Needs review"}</p>
                        </div>
                    ))}
                    {!flaggedChats.length ? <p className="text-sm text-muted-foreground">No flagged chats.</p> : null}
                </div>
            </section>
        </AppFrame>
    );
}
