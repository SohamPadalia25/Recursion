import { motion } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useEffect, useMemo, useState } from "react";
import { getCourseProgress, getMyEnrollments } from "@/lib/course-api";

export function ProgressChart() {
  const [tab, setTab] = useState<"skills" | "streak">("skills");
  const [skillData, setSkillData] = useState<Array<{ subject: string; score: number }>>([]);
  const [streakData, setStreakData] = useState<Array<{ day: string; hours: number }>>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const enrollments = await getMyEnrollments();
        const courseIds = (enrollments || []).map((entry) => entry.course?._id).filter(Boolean);
        const progressList = await Promise.all(
          courseIds.map(async (courseId) => {
            try {
              return await getCourseProgress(courseId);
            } catch {
              return null;
            }
          })
        );

        if (!mounted) return;

        const radar = (enrollments || [])
          .slice(0, 6)
          .map((entry, idx) => ({
            subject: (entry.course?.title || `Course ${idx + 1}`).slice(0, 12),
            score: Number(entry.completionPercentage || 0),
          }));
        setSkillData(radar);

        const completionEvents = progressList
          .filter(Boolean)
          .flatMap((item) => item?.lessons || [])
          .filter((lesson) => lesson?.isCompleted)
          .map((lesson) => {
            const completedAt = lesson?.progress?.completedAt || lesson?.progress?.lastWatchedAt;
            return completedAt ? new Date(completedAt) : null;
          })
          .filter((d): d is Date => Boolean(d));

        const dailyCount = new Map<string, number>();
        completionEvents.forEach((date) => {
          const key = date.toDateString();
          dailyCount.set(key, (dailyCount.get(key) || 0) + 1);
        });

        const week = Array.from({ length: 7 }).map((_, idx) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - idx));
          const key = d.toDateString();
          return {
            day: d.toLocaleDateString(undefined, { weekday: "short" }),
            hours: Number((dailyCount.get(key) || 0).toFixed(1)),
          };
        });
        setStreakData(week);
      } catch {
        if (!mounted) return;
        setSkillData([]);
        setStreakData([]);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const weakestArea = useMemo(() => {
    if (!skillData.length) return null;
    return [...skillData].sort((a, b) => a.score - b.score)[0];
  }, [skillData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="dei-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Progress</h2>
        <div className="flex bg-muted/60 rounded-lg p-0.5">
          {(["skills", "streak"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${tab === t
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {t === "skills" ? "Skill Map" : "Streak"}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56">
        {tab === "skills" ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={skillData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(220 20% 92%)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }}
              />
              <Radar
                dataKey="score"
                stroke="hsl(16 80% 68%)"
                fill="hsl(16 80% 68%)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={streakData}>
              <defs>
                <linearGradient id="streakGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(152 35% 55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(152 35% 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(220 20% 95%)" strokeDasharray="4 4" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(220 10% 50%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(220 10% 50%)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(0 0% 100%)",
                  border: "1px solid hsl(220 20% 92%)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="hsl(152 35% 55%)"
                strokeWidth={2.5}
                fill="url(#streakGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {tab === "skills" && (
        <div className="mt-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-dei-rose" />
          <span className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Weak area:</span>{" "}
            {weakestArea ? `${weakestArea.subject} (${Math.round(weakestArea.score)}%)` : "No data yet"}
          </span>
        </div>
      )}
      {tab === "streak" && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <span className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Weekly activity</span> based on completed lessons
          </span>
        </div>
      )}
    </motion.div>
  );
}
