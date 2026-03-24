import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Lock, CheckCircle2, RefreshCw, Loader2, Sparkles } from "lucide-react";
import {
  getAdaptiveLearningSnapshot,
  type AdaptiveLearningSnapshot,
} from "@/lib/adaptive-learning-api";

type ModuleStatus = "completed" | "active" | "locked";

export type LearningPlanEnrollmentOption = {
  id: string;
  title: string;
};

type LearningPlanProps = {
  enrollments: LearningPlanEnrollmentOption[];
  selectedCourseId: string;
  onSelectCourse: (courseId: string) => void;
};

const difficultyColors: Record<string, string> = {
  Easy: "bg-dei-sage-light text-dei-sage",
  Medium: "bg-dei-amber-light text-dei-amber",
  Hard: "bg-dei-rose-light text-dei-rose",
};

function masteryToDifficulty(mastery: number): "Easy" | "Medium" | "Hard" {
  if (mastery >= 72) return "Easy";
  if (mastery >= 45) return "Medium";
  return "Hard";
}

function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    resume_in_progress: "Resume where you left off",
    mastery_gap_review: "Review — mastery gap",
    syllabus_next: "Next in syllabus",
  };
  return map[reason] || reason.replace(/_/g, " ");
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function LearningPlan({ enrollments, selectedCourseId, onSelectCourse }: LearningPlanProps) {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<AdaptiveLearningSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!selectedCourseId) {
      setSnapshot(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getAdaptiveLearningSnapshot(selectedCourseId);
      setSnapshot(data);
    } catch (e) {
      setSnapshot(null);
      setError(e instanceof Error ? e.message : "Could not load adaptive plan");
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    if (!snapshot?.lessonMetrics?.length) return [];
    const primaryId = snapshot.personalizedPath.primaryNext?.lessonId;
    const sorted = [...snapshot.lessonMetrics].sort((a, b) => a.order - b.order);
    return sorted.map((m) => {
      let status: ModuleStatus;
      if (m.completed) status = "completed";
      else if (primaryId && m.lessonId === primaryId) status = "active";
      else status = "locked";

      const progress = m.completed ? 100 : m.watchRatio;
      const difficulty = masteryToDifficulty(m.mastery);
      const description = [
        m.moduleTitle || "Lesson",
        `Mastery ${m.mastery}%`,
        m.hasQuizData && m.bestQuizScore != null ? `Quiz best ${Math.round(m.bestQuizScore)}%` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      return {
        key: m.lessonId,
        title: m.title,
        description,
        status,
        progress,
        difficulty,
        metric: m,
      };
    });
  }, [snapshot]);

  if (!enrollments.length) {
    return (
      <div className="dei-card p-6 text-center">
        <Sparkles className="w-8 h-8 mx-auto text-primary/70 mb-3" />
        <h2 className="text-lg font-semibold text-foreground">Learning Plan</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enroll in a course to see a personalized path based on your mastery and engagement.
        </p>
        <button
          type="button"
          onClick={() => navigate("/student/courses")}
          className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          Browse courses
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Learning Plan</h2>
          <p className="text-sm text-muted-foreground">AI-curated from your performance and engagement</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCourseId}
            onChange={(e) => onSelectCourse(e.target.value)}
            className="h-10 min-w-[180px] rounded-xl border border-border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring-2"
            aria-label="Course for learning plan"
          >
            {enrollments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || !selectedCourseId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50 active:scale-[0.97]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-dei-rose/30 bg-dei-rose-light/30 px-4 py-3 text-sm text-dei-rose">
          {error}
        </div>
      )}

      {snapshot && (
        <div className="mb-5 rounded-xl border border-border/80 bg-card/50 p-4 space-y-2">
          <p className="text-sm text-foreground leading-relaxed">{snapshot.coachingBrief}</p>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
              Pace: {snapshot.pacing}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
              Depth: {snapshot.contentDensity}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Engagement {snapshot.courseEngagementIndex}%
            </span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Next quiz: {snapshot.quizDifficulty.level} — {snapshot.quizDifficulty.reason}
            </span>
          </div>
          {snapshot.personalizedPath.primaryNext && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Suggested focus: </span>
              {snapshot.personalizedPath.primaryNext.title} —{" "}
              {reasonLabel(snapshot.personalizedPath.primaryNext.reason)}
            </p>
          )}
          {snapshot.focusAreas.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Focus areas: </span>
              {snapshot.focusAreas.join(", ")}
            </p>
          )}
        </div>
      )}

      {loading && !snapshot && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Building your path…</span>
        </div>
      )}

      {!loading && !snapshot && !error && selectedCourseId && (
        <p className="text-sm text-muted-foreground py-8 text-center">No lesson data for this course yet.</p>
      )}

      {rows.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-3 relative"
        >
          <div className="absolute left-7 top-8 bottom-8 w-0.5 bg-border/60 hidden sm:block" />

          {rows.map((mod) => (
            <motion.div
              key={mod.key}
              variants={cardVariant}
              whileHover={mod.status !== "locked" ? { x: 4, transition: { duration: 0.2 } } : {}}
              className={`relative dei-card p-4 sm:pl-16 ${
                mod.status === "active" ? "dei-glow border-primary/30" : ""
              } ${mod.status === "locked" ? "opacity-50" : ""}`}
            >
              <div
                className={`hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full items-center justify-center z-10 ${
                  mod.status === "completed"
                    ? "bg-dei-sage text-primary-foreground"
                    : mod.status === "active"
                      ? "bg-primary text-primary-foreground animate-pulse-soft"
                      : "bg-muted text-muted-foreground"
                }`}
              >
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
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${difficultyColors[mod.difficulty]}`}
                    >
                      {mod.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{mod.description}</p>

                  {mod.status !== "locked" && (
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 max-w-[180px] h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${mod.progress}%` }}
                          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className={`h-full rounded-full ${
                            mod.status === "completed" ? "bg-dei-sage" : "bg-primary"
                          }`}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{mod.progress}%</span>
                    </div>
                  )}
                </div>

                {mod.status === "active" && selectedCourseId && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/student/course/${selectedCourseId}`)}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity self-start sm:self-center"
                  >
                    Continue
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
