import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";

const interests = [
    "AI",
    "Coding",
    "Finance",
    "Design",
    "Data Science",
    "Product",
    "Marketing",
    "Cybersecurity",
];

export default function StudentOnboardingPage() {
    return (
        <AppFrame
            roleLabel="Student"
            title="Personalize Your Learning"
            subtitle="Choose interests to let AI build a plan that fits your pace."
            navItems={studentNav}
        >
            <div className="grid gap-6 lg:grid-cols-3">
                <section className="lg:col-span-2 dei-card p-5 md:p-6">
                    <h2 className="mb-4 text-lg font-semibold">Select your interests</h2>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {interests.map((interest, i) => (
                            <motion.button
                                key={interest}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                whileHover={{ y: -4, scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                className="rounded-xl border border-border bg-card p-3 text-left transition-shadow hover:shadow-md"
                            >
                                <span className="text-sm font-semibold text-foreground">{interest}</span>
                                <p className="mt-1 text-xs text-muted-foreground">AI-curated tracks available</p>
                            </motion.button>
                        ))}
                    </div>
                </section>

                <section className="dei-card space-y-4 p-5 md:p-6">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">AI setup checklist</h3>
                    </div>
                    {[
                        "Select at least 3 interests",
                        "Set weekly time goal",
                        "Pick your preferred learning mode",
                        "Enable reminders",
                    ].map((item, i) => (
                        <div key={item} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className={`h-4 w-4 ${i < 2 ? "text-dei-sage" : "text-muted-foreground"}`} />
                            <span className="text-muted-foreground">{item}</span>
                        </div>
                    ))}
                </section>
            </div>
        </AppFrame>
    );
}
