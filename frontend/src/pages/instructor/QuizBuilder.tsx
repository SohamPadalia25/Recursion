import { AppFrame } from "@/components/platform/AppFrame";
import { instructorNav } from "../roleNav";
import { Button } from "@/components/ui/button";

export default function InstructorQuizBuilderPage() {
    return (
        <AppFrame
            roleLabel="Instructor"
            title="Quiz Builder"
            subtitle="Compose assessments with instant preview and correctness mapping."
            navItems={instructorNav}
        >
            <div className="grid gap-6 lg:grid-cols-2">
                <section className="dei-card p-5">
                    <h2 className="mb-3 text-base font-semibold">Create Question</h2>
                    <div className="space-y-3 text-sm">
                        <input className="h-10 w-full rounded-xl bg-muted/40 px-3 outline-none ring-primary/30 focus:ring-2" placeholder="Question title" />
                        <input className="h-10 w-full rounded-xl bg-muted/40 px-3 outline-none ring-primary/30 focus:ring-2" placeholder="Option A" />
                        <input className="h-10 w-full rounded-xl bg-muted/40 px-3 outline-none ring-primary/30 focus:ring-2" placeholder="Option B" />
                        <Button className="rounded-xl">Add Question</Button>
                    </div>
                </section>

                <section className="dei-card p-5">
                    <h2 className="mb-3 text-base font-semibold">Live Preview</h2>
                    <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                        Preview updates as options and answer key are edited.
                    </div>
                </section>
            </div>
        </AppFrame>
    );
}
