import { motion } from "framer-motion";
import { Play, Lock, CheckCircle2, Users } from "lucide-react";

type ModuleStatus = "completed" | "active" | "locked";

interface Module {
  id: number;
  title: string;
  description: string;
  status: ModuleStatus;
  progress: number;
  difficulty: "Easy" | "Medium" | "Hard";
  collaborators: number;
}

const modules: Module[] = [
  { id: 1, title: "Intro to Machine Learning", description: "Foundations of ML concepts and terminology", status: "completed", progress: 100, difficulty: "Easy", collaborators: 12 },
  { id: 2, title: "Linear Regression Deep Dive", description: "Build your first predictive model from scratch", status: "completed", progress: 100, difficulty: "Easy", collaborators: 8 },
  { id: 3, title: "Neural Networks Basics", description: "Understanding perceptrons and activation functions", status: "active", progress: 62, difficulty: "Medium", collaborators: 15 },
  { id: 4, title: "Convolutional Neural Networks", description: "Image recognition and computer vision fundamentals", status: "locked", progress: 0, difficulty: "Hard", collaborators: 6 },
  { id: 5, title: "Natural Language Processing", description: "Text processing, tokenization, and embeddings", status: "locked", progress: 0, difficulty: "Hard", collaborators: 4 },
];

const difficultyColors: Record<string, string> = {
  Easy: "bg-dei-sage-light text-dei-sage",
  Medium: "bg-dei-amber-light text-dei-amber",
  Hard: "bg-dei-rose-light text-dei-rose",
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

export function LearningPlan() {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Learning Plan</h2>
          <p className="text-sm text-muted-foreground">Your AI-curated pathway</p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors active:scale-[0.97]">
          Generate My Plan ✨
        </button>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-3 relative"
      >
        {/* Connecting line */}
        <div className="absolute left-7 top-8 bottom-8 w-0.5 bg-border/60 hidden sm:block" />

        {modules.map((mod) => (
          <motion.div
            key={mod.id}
            variants={cardVariant}
            whileHover={mod.status !== "locked" ? { x: 4, transition: { duration: 0.2 } } : {}}
            className={`relative dei-card p-4 sm:pl-16 ${
              mod.status === "active" ? "dei-glow border-primary/30" : ""
            } ${mod.status === "locked" ? "opacity-50" : ""}`}
          >
            {/* Node dot */}
            <div className={`hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full items-center justify-center z-10 ${
              mod.status === "completed"
                ? "bg-dei-sage text-primary-foreground"
                : mod.status === "active"
                ? "bg-primary text-primary-foreground animate-pulse-soft"
                : "bg-muted text-muted-foreground"
            }`}>
              {mod.status === "completed" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : mod.status === "active" ? (
                <Play className="w-3.5 h-3.5 ml-0.5" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-foreground text-sm">{mod.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${difficultyColors[mod.difficulty]}`}>
                    {mod.difficulty}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{mod.description}</p>

                {mod.status !== "locked" && (
                  <div className="flex items-center gap-3 mt-2">
                    {/* Progress bar */}
                    <div className="flex-1 max-w-[140px] h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${mod.progress}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className={`h-full rounded-full ${
                          mod.status === "completed" ? "bg-dei-sage" : "bg-primary"
                        }`}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{mod.progress}%</span>

                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span className="text-[11px]">{mod.collaborators}</span>
                    </div>
                  </div>
                )}
              </div>

              {mod.status === "active" && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity self-start sm:self-center"
                >
                  Continue
                </motion.button>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
