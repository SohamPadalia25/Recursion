import { AppFrame } from "@/components/platform/AppFrame";
import { instructorNav } from "../roleNav";
import { Button } from "@/components/ui/button";

export default function InstructorCourseBuilderPage() {
    return (
        <AppFrame
            roleLabel="Instructor"
            title="Course Builder"
            subtitle="Create course structure with modules, content uploads, and AI suggestions."
            navItems={instructorNav}
        >
            <div className="grid gap-6 lg:grid-cols-3">
                <section className="lg:col-span-2 dei-card p-5">
                    <h2 className="mb-4 text-base font-semibold">Step Flow</h2>
                    <div className="grid gap-3 md:grid-cols-3">
                        {[
                            "Course Info",
                            "Modules",
                            "Content",
                        ].map((step, i) => (
                            <div key={step} className={`rounded-xl border p-4 text-sm ${i === 1 ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>
                                {step}
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                        Drag and drop uploads area with file validation and preview.
                    </div>
                </section>

                <section className="dei-card p-5">
                    <h3 className="text-base font-semibold">AI Assist</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Generate lesson outlines, examples, and assessment prompts.</p>
                    <Button className="mt-4 rounded-xl">Generate Content</Button>
                </section>
            </div>
        </AppFrame>
    );
}
