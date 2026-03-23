import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, BookOpen, Loader2 } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { getMyBadges, getMyLearning } from "@/lib/user-api";

type LearningItem = Awaited<ReturnType<typeof getMyLearning>>[number];
type BadgeItem = Awaited<ReturnType<typeof getMyBadges>>[number];

export function MyLearningBadges() {
  const { user } = useAuth();
  const token = user?.accessToken;

  const [learning, setLearning] = useState<LearningItem[]>([]);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topLearning = useMemo(() => learning.slice(0, 3), [learning]);
  const topBadges = useMemo(() => badges.slice(0, 3), [badges]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    Promise.all([getMyLearning(token), getMyBadges(token)])
      .then(([learningRes, badgesRes]) => {
        setLearning(learningRes);
        setBadges(badgesRes);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load learning/badges");
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="dei-card p-5 md:p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dei-sage/15 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-dei-sage" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-foreground">My Learning</h3>
            <p className="text-xs text-muted-foreground">Personalized from your account</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="w-4 h-4" />
          <span>Badges included</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Enrolled</h4>
            {topLearning.length === 0 ? (
              <p className="text-xs text-muted-foreground">No learning found yet.</p>
            ) : (
              topLearning.map((item) => (
                <div key={item._id} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{item.course.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {item.course.category || "Learning"} • {item.isCompleted ? "Completed" : "In progress"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {typeof item.completionPercentage === "number" ? `${item.completionPercentage}%` : "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {item.course.instructor?.fullname ? `by ${item.course.instructor.fullname}` : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Recent badges</h4>
            {topBadges.length === 0 ? (
              <p className="text-xs text-muted-foreground">No badges yet.</p>
            ) : (
              topBadges.map((b) => (
                <div key={b._id} className="rounded-xl border border-border/60 p-3">
                  <p className="text-sm font-medium text-foreground">
                    {b.course?.title ? b.course.title : "Platform"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.type.split("_").join(" ")}
                    {b.awardedAt ? ` • ${new Date(b.awardedAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </motion.section>
  );
}

