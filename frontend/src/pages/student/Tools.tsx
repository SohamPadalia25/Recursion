import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";

const tools = [
    { title: "Code Editor", desc: "Practice coding with structured prompts and instant checks." },
    { title: "Whiteboard", desc: "Visualize system design and algorithm flows quickly." },
    { title: "Video Call", desc: "Join guided mentor sessions with collaboration tools." },
];

export default function StudentToolsPage() {
    return (
        <AppFrame
            roleLabel="Student"
            title="Learning Tools"
            subtitle="Use focused tools for coding, collaboration, and visual learning."
            navItems={studentNav}
        >
            <div className="grid gap-4 md:grid-cols-3">
                {tools.map((tool) => (
                    <article key={tool.title} className="dei-card p-5">
                        <h2 className="text-base font-semibold text-foreground">{tool.title}</h2>
                        <p className="mt-2 text-sm text-muted-foreground">{tool.desc}</p>
                        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-8 text-center text-xs text-muted-foreground">
                            Interactive panel
                        </div>
                    </article>
                ))}
            </div>
        </AppFrame>
    );
}
