import { motion } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useState } from "react";

const skillData = [
  { subject: "ML Basics", score: 92 },
  { subject: "Statistics", score: 78 },
  { subject: "Python", score: 88 },
  { subject: "Deep Learning", score: 55 },
  { subject: "NLP", score: 40 },
  { subject: "Data Viz", score: 85 },
];

const streakData = [
  { day: "Mon", hours: 1.5 },
  { day: "Tue", hours: 2.1 },
  { day: "Wed", hours: 0.8 },
  { day: "Thu", hours: 3.2 },
  { day: "Fri", hours: 2.5 },
  { day: "Sat", hours: 1.2 },
  { day: "Sun", hours: 2.8 },
];

export function ProgressChart() {
  const [tab, setTab] = useState<"skills" | "streak">("skills");

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
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                tab === t
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
            <span className="font-medium text-foreground">Weak area:</span> NLP — consider reviewing Module 5
          </span>
        </div>
      )}
      {tab === "streak" && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <span className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">7-day streak!</span> Keep it going
          </span>
        </div>
      )}
    </motion.div>
  );
}
