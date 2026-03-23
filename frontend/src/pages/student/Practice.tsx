import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";

const options = [
    "Fine-tune only on unlabelled datasets",
    "Retrieve relevant context before generation",
    "Disable model memory permanently",
    "Replace embeddings with plain regex",
];

export default function StudentPracticePage() {
    return (
        <AppFrame
            roleLabel="Student"
            title="Practice Quiz"
            subtitle="Fast feedback with XP-style momentum and retry flow."
            navItems={studentNav}
        >
            <div className="mx-auto max-w-3xl dei-card p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Question 3 of 10</span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">+20 XP</span>
                </div>
                <div className="mb-4 h-2 rounded-full bg-muted">
                    <motion.div initial={{ width: 0 }} animate={{ width: "30%" }} transition={{ duration: 0.7 }} className="h-2 rounded-full bg-primary" />
                </div>

                <h2 className="text-lg font-semibold text-foreground">Which approach best describes Retrieval-Augmented Generation?</h2>

                <div className="mt-5 space-y-3">
                    {options.map((option, i) => (
                        <motion.button
                            key={option}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full rounded-xl border p-4 text-left transition-colors ${i === 1
                                    ? "border-dei-sage bg-dei-sage/10"
                                    : i === 3
                                        ? "border-dei-rose bg-dei-rose/10"
                                        : "border-border bg-card"
                                }`}
                        >
                            <span className="text-sm font-medium text-foreground">{option}</span>
                            {i === 1 && <CheckCircle2 className="mt-2 h-4 w-4 text-dei-sage" />}
                            {i === 3 && <XCircle className="mt-2 h-4 w-4 text-dei-rose" />}
                        </motion.button>
                    ))}
                </div>
            </div>
        </AppFrame>
    );
}
