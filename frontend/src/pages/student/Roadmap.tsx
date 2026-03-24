import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";
import RoadmapGraph, { type RoadmapLink, type RoadmapNode } from "@/components/roadmap/RoadmapGraph";
import { API_BASE_URL } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type GraphResponse = {
  nodes: RoadmapNode[];
  links: RoadmapLink[];
};

type StudyCard = {
  id: string;
  title: string;
  checkpointCount: number;
  estimatedMinutes: number;
  accent: "orange" | "green" | "indigo";
  track: Track;
};

type DayColumn = {
  key: string;
  label: string;
  dateNumber: number;
  cards: StudyCard[];
};

type DragState = {
  fromDayKey: string;
  cardId: string;
} | null;

type Track = "ml-foundations" | "deep-learning" | "genai" | "mlops";
type Level = "beginner" | "intermediate" | "advanced";

type TopicTemplate = {
  title: string;
  track: Track;
  level: Level;
  baseMinutes: number;
  baseCheckpoints: number;
};

type RoadmapPreferences = {
  dailyStudyMinutes: number;
  primaryTrack: Track;
  secondaryTrack: Track;
  targetLevel: Level;
  includeRevisionBlock: boolean;
};

const topicCatalog: TopicTemplate[] = [
  { title: "Linear Regression Foundations", track: "ml-foundations", level: "beginner", baseMinutes: 32, baseCheckpoints: 14 },
  { title: "Feature Scaling & Normalization", track: "ml-foundations", level: "beginner", baseMinutes: 22, baseCheckpoints: 10 },
  { title: "Bias vs Variance Tradeoff", track: "ml-foundations", level: "intermediate", baseMinutes: 28, baseCheckpoints: 12 },
  { title: "Logistic Regression Intuition", track: "ml-foundations", level: "beginner", baseMinutes: 30, baseCheckpoints: 13 },
  { title: "Gradient Descent Deep Dive", track: "ml-foundations", level: "intermediate", baseMinutes: 37, baseCheckpoints: 17 },
  { title: "Model Evaluation Metrics", track: "ml-foundations", level: "intermediate", baseMinutes: 24, baseCheckpoints: 11 },
  { title: "Decision Trees & Splitting", track: "ml-foundations", level: "intermediate", baseMinutes: 33, baseCheckpoints: 16 },
  { title: "Random Forest Ensemble", track: "ml-foundations", level: "intermediate", baseMinutes: 29, baseCheckpoints: 13 },
  { title: "Neural Network Basics", track: "deep-learning", level: "intermediate", baseMinutes: 41, baseCheckpoints: 18 },
  { title: "Backpropagation Visual Walkthrough", track: "deep-learning", level: "intermediate", baseMinutes: 34, baseCheckpoints: 15 },
  { title: "Activation Functions Comparison", track: "deep-learning", level: "intermediate", baseMinutes: 22, baseCheckpoints: 10 },
  { title: "CNN Fundamentals", track: "deep-learning", level: "advanced", baseMinutes: 44, baseCheckpoints: 20 },
  { title: "Image Classifier Mini Project", track: "deep-learning", level: "advanced", baseMinutes: 54, baseCheckpoints: 24 },
  { title: "Transformer Attention Basics", track: "deep-learning", level: "advanced", baseMinutes: 46, baseCheckpoints: 21 },
  { title: "Prompt Engineering Workshop", track: "genai", level: "beginner", baseMinutes: 26, baseCheckpoints: 12 },
  { title: "RAG Pipeline Fundamentals", track: "genai", level: "advanced", baseMinutes: 48, baseCheckpoints: 22 },
  { title: "Vector Database Retrieval", track: "genai", level: "advanced", baseMinutes: 40, baseCheckpoints: 17 },
  { title: "Prompt Safety & Guardrails", track: "genai", level: "intermediate", baseMinutes: 29, baseCheckpoints: 12 },
  { title: "MLOps Deployment Checklist", track: "mlops", level: "intermediate", baseMinutes: 31, baseCheckpoints: 14 },
  { title: "Model Drift Monitoring", track: "mlops", level: "advanced", baseMinutes: 27, baseCheckpoints: 11 },
  { title: "A/B Testing for ML Models", track: "mlops", level: "advanced", baseMinutes: 30, baseCheckpoints: 13 },
  { title: "CI/CD for ML Pipelines", track: "mlops", level: "intermediate", baseMinutes: 35, baseCheckpoints: 15 },
  { title: "Capstone: End-to-End AI Workflow", track: "mlops", level: "advanced", baseMinutes: 56, baseCheckpoints: 26 },
];

const defaultPreferences: RoadmapPreferences = {
  dailyStudyMinutes: 90,
  primaryTrack: "genai",
  secondaryTrack: "ml-foundations",
  targetLevel: "intermediate",
  includeRevisionBlock: true,
};

const accents: StudyCard["accent"][] = ["orange", "green", "indigo"];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const shuffle = <T,>(arr: T[]) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
};

const levelWeight: Record<Level, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const trackLabel: Record<Track, string> = {
  "ml-foundations": "ML Foundations",
  "deep-learning": "Deep Learning",
  genai: "Generative AI",
  mlops: "MLOps",
};

const topicMatchesLevel = (topicLevel: Level, targetLevel: Level) => {
  const t = levelWeight[topicLevel];
  const target = levelWeight[targetLevel];

  if (targetLevel === "beginner") return t === 1;
  if (targetLevel === "intermediate") return t <= 2;
  return t >= 2;
};

const buildTopicBuckets = (prefs: RoadmapPreferences) => {
  const primaryPreferred = topicCatalog.filter(
    (topic) => topic.track === prefs.primaryTrack && topicMatchesLevel(topic.level, prefs.targetLevel),
  );
  const secondaryPreferred = topicCatalog.filter(
    (topic) => topic.track === prefs.secondaryTrack && topicMatchesLevel(topic.level, prefs.targetLevel),
  );
  const otherPreferred = topicCatalog.filter(
    (topic) =>
      topic.track !== prefs.primaryTrack &&
      topic.track !== prefs.secondaryTrack &&
      topicMatchesLevel(topic.level, prefs.targetLevel),
  );

  const primaryAll = topicCatalog.filter((topic) => topic.track === prefs.primaryTrack);
  const secondaryAll = topicCatalog.filter((topic) => topic.track === prefs.secondaryTrack);
  const otherAll = topicCatalog.filter(
    (topic) => topic.track !== prefs.primaryTrack && topic.track !== prefs.secondaryTrack,
  );

  return {
    primary: shuffle(primaryPreferred.length ? primaryPreferred : primaryAll),
    secondary: shuffle(secondaryPreferred.length ? secondaryPreferred : secondaryAll),
    others: shuffle(otherPreferred.length ? otherPreferred : otherAll),
  };
};

const makeMockPlan = (prefs: RoadmapPreferences): DayColumn[] => {
  const now = new Date();
  const day = now.getDay();
  const mondayDiff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayDiff);

  const labels = ["MON", "TUE", "WED", "THU", "FRI"];
  const days = labels.map((label, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    return {
      key: label,
      label,
      dateNumber: d.getDate(),
      cards: [] as StudyCard[],
    };
  });

  const buckets = buildTopicBuckets(prefs);
  const indexByBucket = { primary: 0, secondary: 0, others: 0 };

  const pickFromBucket = (bucket: "primary" | "secondary" | "others") => {
    const list = buckets[bucket];
    if (!list.length) return null;
    const idx = indexByBucket[bucket] % list.length;
    indexByBucket[bucket] += 1;
    return list[idx];
  };

  const pickTopic = () => {
    const roll = randomInt(1, 100);

    // Strong preference distribution:
    // primary ~65%, secondary ~25%, others ~10%
    const preferredOrder =
      roll <= 65
        ? (["primary", "secondary", "others"] as const)
        : roll <= 90
          ? (["secondary", "primary", "others"] as const)
          : (["others", "primary", "secondary"] as const);

    for (const bucket of preferredOrder) {
      const topic = pickFromBucket(bucket);
      if (topic) return topic;
    }

    return topicCatalog[randomInt(0, topicCatalog.length - 1)];
  };

  const cardsByDay: Record<string, StudyCard[]> = {};
  days.forEach((day) => {
    const dailyBudget = prefs.dailyStudyMinutes;
    const softLimit = Math.round(dailyBudget * 1.1);
    const avgSessionTarget = prefs.targetLevel === "advanced" ? 36 : prefs.targetLevel === "intermediate" ? 32 : 28;
    const sessionEstimate = Math.max(2, Math.round(prefs.dailyStudyMinutes / avgSessionTarget));
    const minSessions = clamp(sessionEstimate - 1, 1, 4);
    const maxSessions = clamp(sessionEstimate + 1, minSessions, 5);

    let consumedMinutes = 0;
    const dayCards: StudyCard[] = [];
    let cardIdx = 0;
    let attempts = 0;

    while (dayCards.length < maxSessions && attempts < maxSessions * 6) {
      attempts += 1;
      const topic = pickTopic();

      const dailyScale = prefs.dailyStudyMinutes >= 140 ? 1.18 : prefs.dailyStudyMinutes >= 110 ? 1.08 : prefs.dailyStudyMinutes <= 70 ? 0.88 : 1;
      const levelScale = prefs.targetLevel === "advanced" ? 1.12 : prefs.targetLevel === "intermediate" ? 1.03 : 0.95;
      const baseMinutes = (topic.baseMinutes + randomInt(-4, 7)) * dailyScale * levelScale;
      const naturalMinutes = clamp(Math.round(baseMinutes), 14, 72);
      const remaining = Math.max(0, dailyBudget - consumedMinutes);
      const estimatedMinutes = remaining > 0
        ? clamp(Math.min(naturalMinutes, remaining + 12), 14, 72)
        : naturalMinutes;

      const wouldExceedLimit = consumedMinutes + estimatedMinutes > softLimit;
      if (wouldExceedLimit && dayCards.length >= minSessions) {
        continue;
      }

      const levelCheckpointBoost = prefs.targetLevel === "advanced" ? 3 : prefs.targetLevel === "intermediate" ? 1 : 0;

      dayCards.push({
        id: `${day.key.toLowerCase()}-${Date.now()}-${cardIdx}-${randomInt(100, 999)}`,
        title: topic.title,
        checkpointCount: Math.max(6, topic.baseCheckpoints + levelCheckpointBoost + randomInt(-2, 4)),
        estimatedMinutes,
        accent: accents[randomInt(0, accents.length - 1)],
        track: topic.track,
      });
      cardIdx += 1;
      consumedMinutes += estimatedMinutes;

      if (consumedMinutes >= dailyBudget && dayCards.length >= minSessions) {
        break;
      }
    }

    while (dayCards.length < minSessions) {
      const fallbackMinutes = clamp(Math.max(14, dailyBudget - consumedMinutes), 14, 24);
      dayCards.push({
        id: `${day.key.toLowerCase()}-fallback-${Date.now()}-${dayCards.length}-${randomInt(100, 999)}`,
        title: `Practice Sprint (${trackLabel[prefs.primaryTrack]})`,
        checkpointCount: randomInt(6, 10),
        estimatedMinutes: fallbackMinutes,
        accent: "indigo",
        track: prefs.primaryTrack,
      });
      consumedMinutes += fallbackMinutes;
    }

    if (prefs.includeRevisionBlock && consumedMinutes < prefs.dailyStudyMinutes - 15) {
      const revisionMinutes = Math.min(20, Math.max(14, prefs.dailyStudyMinutes - consumedMinutes));
      if (consumedMinutes + revisionMinutes <= softLimit) {
        dayCards.push({
        id: `${day.key.toLowerCase()}-rev-${Date.now()}-${randomInt(100, 999)}`,
        title: `Revision Sprint (${trackLabel[prefs.primaryTrack]})`,
        checkpointCount: randomInt(6, 12),
        estimatedMinutes: revisionMinutes,
        accent: "orange",
        track: prefs.primaryTrack,
        });
      }
    }

    cardsByDay[day.key] = dayCards;
  });

  return days.map((d) => ({
    ...d,
    cards: cardsByDay[d.key] || [],
  }));
};

const accentBarClass: Record<StudyCard["accent"], string> = {
  orange: "bg-orange-400",
  green: "bg-emerald-400",
  indigo: "bg-indigo-400",
};

export default function StudentRoadmapPage() {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [dragging, setDragging] = useState<DragState>(null);
  const [preferences, setPreferences] = useState<RoadmapPreferences>(defaultPreferences);
  const [studyPlan, setStudyPlan] = useState<DayColumn[]>(() => makeMockPlan(defaultPreferences));
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<DayColumn[] | null>(null);
  const [regenCycle, setRegenCycle] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadGraph() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/graph`);

        if (!response.ok) {
          throw new Error("Failed to fetch roadmap graph");
        }

        const data: GraphResponse = await response.json();
        setGraph(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadGraph();
  }, []);

  const stats = useMemo(() => {
    const total = graph?.nodes.length ?? 0;
    const categories = graph?.nodes.filter((n) => n.type === "category").length ?? 0;
    const courses = graph?.nodes.filter((n) => n.type === "course").length ?? 0;
    return { total, categories, courses };
  }, [graph]);

  const planStats = useMemo(() => {
    const totalCards = studyPlan.reduce((sum, day) => sum + day.cards.length, 0);
    const totalMinutes = studyPlan.reduce(
      (sum, day) => sum + day.cards.reduce((daySum, c) => daySum + c.estimatedMinutes, 0),
      0,
    );
    return { totalCards, totalMinutes };
  }, [studyPlan]);

  const regeneratePlan = () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    setDragging(null);
    setPendingPlan(makeMockPlan(preferences));
    setRegenCycle((prev) => prev + 1);
  };

  const finalizeRegeneration = () => {
    setStudyPlan((prev) => pendingPlan || prev);
    setPendingPlan(null);
    setIsRegenerating(false);
  };

  const handleDrop = (toDayKey: string) => {
    if (!manualMode || !dragging) return;

    setStudyPlan((prev) => {
      const next = prev.map((day) => ({ ...day, cards: [...day.cards] }));
      const fromDay = next.find((day) => day.key === dragging.fromDayKey);
      const toDay = next.find((day) => day.key === toDayKey);

      if (!fromDay || !toDay) return prev;

      const cardIndex = fromDay.cards.findIndex((c) => c.id === dragging.cardId);
      if (cardIndex < 0) return prev;

      const [card] = fromDay.cards.splice(cardIndex, 1);
      toDay.cards.push(card);
      return next;
    });

    setDragging(null);
  };

  return (
    <AppFrame
      roleLabel="Student"
      title="AI Learning Roadmap"
      subtitle="Explore the Artificial Intelligence graph and open any course node for details."
      navItems={studentNav}
    >
      <section className="rounded-2xl border border-orange-300 bg-gradient-to-br from-orange-50 via-card to-amber-50 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">AI-Generated Personalized Study Plan</p>
            <h2 className="mt-1 text-xl font-bold text-foreground md:text-2xl">Weekly plan preview (mock data)</h2>
            <p className="mt-1 text-sm text-muted-foreground">Switch on Manual Change to drag and drop cards across days.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={regeneratePlan}>Regenerate Plan</Button>
            <Button className={`rounded-xl ${manualMode ? "bg-orange-500 hover:bg-orange-600" : ""}`} onClick={() => setManualMode((prev) => !prev)} disabled={isRegenerating}>
              {manualMode ? "Manual Change: ON" : "Manual Change"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-3 md:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs text-muted-foreground">
            Daily Study Time (minutes)
            <input
              type="number"
              min={45}
              max={240}
              step={5}
              value={preferences.dailyStudyMinutes}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  dailyStudyMinutes: Math.max(45, Math.min(240, Number(e.target.value) || 90)),
                }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>

          <label className="text-xs text-muted-foreground">
            Primary Priority
            <select
              value={preferences.primaryTrack}
              onChange={(e) => setPreferences((prev) => ({ ...prev, primaryTrack: e.target.value as Track }))}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            >
              {Object.entries(trackLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="text-xs text-muted-foreground">
            Secondary Priority
            <select
              value={preferences.secondaryTrack}
              onChange={(e) => setPreferences((prev) => ({ ...prev, secondaryTrack: e.target.value as Track }))}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            >
              {Object.entries(trackLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="text-xs text-muted-foreground">
            Target Level
            <select
              value={preferences.targetLevel}
              onChange={(e) => setPreferences((prev) => ({ ...prev, targetLevel: e.target.value as Level }))}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={preferences.includeRevisionBlock}
              onChange={(e) => setPreferences((prev) => ({ ...prev, includeRevisionBlock: e.target.checked }))}
            />
            Add revision blocks automatically
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          {studyPlan.map((day) => (
            <div
              key={day.key}
              className={`rounded-xl border bg-slate-100/80 p-3 ${manualMode ? "border-orange-300" : "border-border"}`}
              onDragOver={(e) => {
                if (!manualMode) return;
                e.preventDefault();
              }}
              onDrop={() => handleDrop(day.key)}
            >
              <div className="mb-3 border-b border-border pb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day.label}</p>
                <p className="text-2xl font-bold text-slate-800">{day.dateNumber}</p>
              </div>

              <div className="space-y-2">
                {day.cards.map((card) => (
                  <article
                    key={card.id}
                    draggable={manualMode}
                    onDragStart={() => {
                      if (!manualMode) return;
                      setDragging({ fromDayKey: day.key, cardId: card.id });
                    }}
                    onDragEnd={() => setDragging(null)}
                    className={`rounded-lg border border-border bg-white px-3 py-2 shadow-sm ${manualMode ? "cursor-grab active:cursor-grabbing" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 inline-block h-10 w-1 rounded-full ${accentBarClass[card.accent]}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{card.title}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{card.checkpointCount} checkpoints</span>
                          <span>•</span>
                          <span>{card.estimatedMinutes}m</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
                {!day.cards.length ? (
                  <div className="rounded-lg border border-dashed border-border bg-white/70 px-2 py-4 text-center text-xs text-muted-foreground">
                    Drop card here
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Planned Sessions</p>
            <p className="mt-1 text-xl font-bold text-foreground">{planStats.totalCards}</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Estimated Study Time</p>
            <p className="mt-1 text-xl font-bold text-foreground">{planStats.totalMinutes} min</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Graph Categories</p>
            <p className="mt-1 text-xl font-bold text-blue-600">{stats.categories}</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Graph Courses</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">{stats.courses}</p>
          </article>
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 rounded-xl border border-border bg-card p-3">
          <p className="text-sm font-semibold text-foreground">Knowledge Graph</p>
          <p className="text-xs text-muted-foreground">Click any course node to open details.</p>
        </div>

        {loading ? (
          <div className="dei-card flex h-[560px] items-center justify-center p-6 text-sm text-muted-foreground">
            <span className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-primary" />
            Loading roadmap...
          </div>
        ) : null}

        {error ? (
          <div className="dei-card flex h-[560px] items-center justify-center p-6 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!loading && !error && graph ? (
          <RoadmapGraph
            nodes={graph.nodes}
            links={graph.links}
            onCourseClick={(id) => navigate(`/student/roadmap/course/${id}`)}
          />
        ) : null}
      </section>

      {isRegenerating ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="w-[92vw] max-w-md rounded-2xl border border-orange-300 bg-card p-4 shadow-2xl">
            <video
              key={`regen-${regenCycle}`}
              src="/Loading%20Files.mp4"
              autoPlay
              muted
              playsInline
              onEnded={finalizeRegeneration}
              onError={finalizeRegeneration}
              className="h-52 w-full rounded-xl object-cover"
            />
            <p className="mt-3 text-center text-sm font-semibold text-foreground">Regenerating your AI study plan...</p>
            <p className="mt-1 text-center text-xs text-muted-foreground">Rebalancing topics, load, and weekly flow</p>
          </div>
        </div>
      ) : null}
    </AppFrame>
  );
}
