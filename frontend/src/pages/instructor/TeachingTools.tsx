import { AppFrame } from "@/components/platform/AppFrame";
import { instructorNav } from "../roleNav";

export default function InstructorTeachingToolsPage() {
    return (
        <AppFrame
            roleLabel="Instructor"
            title="Teaching Tools"
            subtitle="Run classes with live video, whiteboard, and participant controls."
            navItems={instructorNav}
        >
            <div className="grid gap-4 lg:grid-cols-3">
                <section className="lg:col-span-2 dei-card p-5">
                    <div className="aspect-video rounded-xl bg-gradient-to-br from-dei-sky/20 to-dei-sage/20 p-4">
                        <div className="flex h-full items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
                            Live class stream
                        </div>
                    </div>
                </section>
                <section className="dei-card p-5 text-sm text-muted-foreground">
                    Participants panel and session controls
                </section>
            </div>
        </AppFrame>
    );
}
