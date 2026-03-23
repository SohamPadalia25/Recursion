import { AppFrame } from "@/components/platform/AppFrame";
import { adminNav } from "../roleNav";
import { Button } from "@/components/ui/button";

const flagged = [
    "Inappropriate quiz text in Web Dev 101",
    "Spam review bursts in Python Basics",
    "Copyright complaint on uploaded lecture",
];

export default function AdminModerationPage() {
    return (
        <AppFrame
            roleLabel="Admin"
            title="Moderation"
            subtitle="Resolve flagged content and keep quality standards high."
            navItems={adminNav}
        >
            <section className="dei-card p-5">
                <h2 className="mb-4 text-base font-semibold">Flagged Content Queue</h2>
                <div className="space-y-3">
                    {flagged.map((item) => (
                        <div key={item} className="rounded-xl border border-border bg-card p-4">
                            <p className="text-sm text-foreground">{item}</p>
                            <div className="mt-3 flex gap-2">
                                <Button size="sm" className="rounded-lg">Approve</Button>
                                <Button size="sm" variant="outline" className="rounded-lg">Reject</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </AppFrame>
    );
}
