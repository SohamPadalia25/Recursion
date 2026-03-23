import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "@/pages/roleNav";
import { getNeo4jInsights } from "@/lib/neo4j-api";

const tabs = [
  { key: "structure", label: "Course Structure" },
  { key: "knowledge", label: "Knowledge Graph" },
  { key: "roadmap", label: "Roadmaps" },
  { key: "debt", label: "Study Debt" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function ScoreBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "bg-emerald-100 text-emerald-700" : pct >= 50 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{pct}%</span>;
}

export default function StudentNeo4jInsightsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("structure");
  const [filters, setFilters] = useState({
    studentId: "stu-001",
    courseId: "course-001",
    roadmapId: "road-001",
    roleRoadmapId: "road-004",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const { data, isLoading, error } = useQuery({
    queryKey: ["neo4j-insights", appliedFilters],
    queryFn: () => getNeo4jInsights(appliedFilters),
  });

  const groupedStructure = useMemo(() => {
    const map = new Map<string, Array<{ topic: string; topicOrder: number; contentType: string }>>();
    for (const row of data?.courseStructure || []) {
      const key = `${row.moduleOrder}. ${row.module}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push({ topic: row.topic, topicOrder: row.topicOrder, contentType: row.contentType });
    }

    return Array.from(map.entries()).map(([module, topics]) => ({
      module,
      topics: topics.sort((a, b) => a.topicOrder - b.topicOrder),
    }));
  }, [data?.courseStructure]);

  return (
    <AppFrame
      roleLabel="Student"
      title="Neo4j Learning Insights"
      subtitle="Clean view of structure, mastery, roadmap progression, and study debt from your graph data"
      navItems={studentNav}
    >
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <article className="dei-card p-4">
          <p className="text-xs text-muted-foreground">Student</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{data?.studyDebt?.student || "stu-001"}</p>
        </article>
        <article className="dei-card p-4">
          <p className="text-xs text-muted-foreground">Concepts Tracked</p>
          <p className="mt-1 text-lg font-bold text-foreground">{data?.mastery?.length || 0}</p>
        </article>
        <article className="dei-card p-4">
          <p className="text-xs text-muted-foreground">Ready To Learn</p>
          <p className="mt-1 text-lg font-bold text-foreground">{data?.readyToLearn?.length || 0}</p>
        </article>
        <article className="dei-card p-4">
          <p className="text-xs text-muted-foreground">Study Debt</p>
          <p className="mt-1 text-lg font-bold text-foreground">{data?.studyDebt?.studyDebtPoints ?? "-"}</p>
        </article>
      </div>

      <section className="mb-5 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Neo4j Filter Context</h3>
          <button
            type="button"
            onClick={() => setAppliedFilters(filters)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Apply
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={filters.studentId}
            onChange={(e) => setFilters((prev) => ({ ...prev, studentId: e.target.value }))}
            placeholder="student id"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={filters.courseId}
            onChange={(e) => setFilters((prev) => ({ ...prev, courseId: e.target.value }))}
            placeholder="course id"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={filters.roadmapId}
            onChange={(e) => setFilters((prev) => ({ ...prev, roadmapId: e.target.value }))}
            placeholder="linear roadmap id"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={filters.roleRoadmapId}
            onChange={(e) => setFilters((prev) => ({ ...prev, roleRoadmapId: e.target.value }))}
            placeholder="role roadmap id"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </section>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? <div className="dei-card p-5 text-sm text-muted-foreground">Loading Neo4j insights...</div> : null}
      {error ? <div className="dei-card p-5 text-sm text-destructive">{(error as Error).message}</div> : null}

      {!isLoading && !error && data && activeTab === "structure" ? (
        <section className="grid gap-4">
          <article className="dei-card overflow-x-auto p-4">
            <h3 className="mb-3 text-base font-semibold text-foreground">Course Summary</h3>
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pr-3">Course</th>
                  <th className="pb-2 pr-3">Level</th>
                  <th className="pb-2 pr-3">Modules</th>
                  <th className="pb-2 pr-3">Duration (mins)</th>
                </tr>
              </thead>
              <tbody>
                {data.coursesSummary.map((row) => (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="py-2 pr-3">{row.title}</td>
                    <td className="py-2 pr-3">{row.level}</td>
                    <td className="py-2 pr-3">{row.moduleCount}</td>
                    <td className="py-2 pr-3">{row.totalDurationMins || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="dei-card p-4">
            <h3 className="mb-3 text-base font-semibold text-foreground">Module → Topic Layout</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {groupedStructure.map((moduleRow) => (
                <div key={moduleRow.module} className="rounded-xl border border-border p-3">
                  <p className="mb-2 text-sm font-semibold text-foreground">{moduleRow.module}</p>
                  <div className="space-y-1.5">
                    {moduleRow.topics.map((topicRow) => (
                      <div key={`${moduleRow.module}-${topicRow.topicOrder}`} className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs">
                        <span>{topicRow.topicOrder}. {topicRow.topic}</span>
                        <span className="text-muted-foreground">{topicRow.contentType}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {!isLoading && !error && data && activeTab === "knowledge" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="dei-card overflow-x-auto p-4 lg:col-span-2">
            <h3 className="mb-3 text-base font-semibold text-foreground">Mastery Table</h3>
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pr-3">Concept</th>
                  <th className="pb-2 pr-3">Domain</th>
                  <th className="pb-2 pr-3">Mastery</th>
                  <th className="pb-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.mastery.map((row) => (
                  <tr key={row.concept} className="border-t border-border/60">
                    <td className="py-2 pr-3">{row.concept}</td>
                    <td className="py-2 pr-3">{row.domain}</td>
                    <td className="py-2 pr-3"><ScoreBadge value={row.masteryScore} /></td>
                    <td className="py-2 pr-3 capitalize">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="dei-card p-4">
            <h3 className="mb-3 text-base font-semibold text-foreground">Ready To Learn Next</h3>
            <div className="space-y-2">
              {data.readyToLearn.map((row) => (
                <div key={row.readyToLearn} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">{row.readyToLearn}</p>
                  <p className="text-xs text-muted-foreground">{row.domain} • Difficulty {row.difficulty}</p>
                </div>
              ))}
              {data.readyToLearn.length === 0 ? <p className="text-sm text-muted-foreground">No ready concepts currently.</p> : null}
            </div>
          </article>

          <article className="dei-card p-4">
            <h3 className="mb-3 text-base font-semibold text-foreground">Decaying Concepts (7+ days)</h3>
            <div className="space-y-2">
              {data.decayingConcepts.map((row) => (
                <div key={row.concept} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">{row.concept}</p>
                  <p className="text-xs text-muted-foreground">{Math.round(row.currentMastery * 100)}% • {row.daysSinceReview} days since review</p>
                </div>
              ))}
              {data.decayingConcepts.length === 0 ? <p className="text-sm text-muted-foreground">No decaying concepts detected.</p> : null}
            </div>
          </article>

          <article className="dei-card overflow-x-auto p-4 lg:col-span-2">
            <h3 className="mb-3 text-base font-semibold text-foreground">Domain Heatmap (Table View)</h3>
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pr-3">Domain</th>
                  <th className="pb-2 pr-3">Avg Mastery</th>
                  <th className="pb-2 pr-3">Concept Count</th>
                  <th className="pb-2 pr-3">Weakest Score</th>
                </tr>
              </thead>
              <tbody>
                {data.heatmap.map((row) => (
                  <tr key={row.domain} className="border-t border-border/60">
                    <td className="py-2 pr-3">{row.domain}</td>
                    <td className="py-2 pr-3">{row.avgMastery}</td>
                    <td className="py-2 pr-3">{row.conceptCount}</td>
                    <td className="py-2 pr-3">{row.weakestScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </section>
      ) : null}

      {!isLoading && !error && data && activeTab === "roadmap" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="dei-card overflow-x-auto p-4">
            <h3 className="mb-3 text-base font-semibold text-foreground">Linear Roadmap Steps</h3>
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pr-3">Step</th>
                  <th className="pb-2 pr-3">Course</th>
                  <th className="pb-2 pr-3">Level</th>
                </tr>
              </thead>
              <tbody>
                {data.linearRoadmap.map((row) => (
                  <tr key={`${row.roadmap}-${row.step}`} className="border-t border-border/60">
                    <td className="py-2 pr-3">{row.step}</td>
                    <td className="py-2 pr-3">{row.course}</td>
                    <td className="py-2 pr-3">{row.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="dei-card overflow-x-auto p-4">
            <h3 className="mb-3 text-base font-semibold text-foreground">Roadmap Completion</h3>
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pr-3">Roadmap</th>
                  <th className="pb-2 pr-3">Type</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Completion</th>
                </tr>
              </thead>
              <tbody>
                {data.roadmapProgress.map((row) => (
                  <tr key={`${row.roadmap}-${row.type}`} className="border-t border-border/60">
                    <td className="py-2 pr-3">{row.roadmap}</td>
                    <td className="py-2 pr-3">{row.type}</td>
                    <td className="py-2 pr-3">{row.status}</td>
                    <td className="py-2 pr-3">{row.completionPct || 0}% ({row.done}/{row.total})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="dei-card overflow-x-auto p-4 lg:col-span-2">
            <h3 className="mb-3 text-base font-semibold text-foreground">Role-Based Concept Gaps</h3>
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pr-3">Concept Gap</th>
                  <th className="pb-2 pr-3">Domain</th>
                  <th className="pb-2 pr-3">Mastery %</th>
                </tr>
              </thead>
              <tbody>
                {data.roleGap.map((row) => (
                  <tr key={row.conceptGap} className="border-t border-border/60">
                    <td className="py-2 pr-3">{row.conceptGap}</td>
                    <td className="py-2 pr-3">{row.domain}</td>
                    <td className="py-2 pr-3">{row.masteryPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </section>
      ) : null}

      {!isLoading && !error && data && activeTab === "debt" ? (
        <section className="grid gap-4 md:grid-cols-3">
          <article className="dei-card p-5 md:col-span-1">
            <p className="text-sm text-muted-foreground">Current Debt Status</p>
            <p className="mt-2 text-2xl font-bold text-foreground capitalize">{data.studyDebt?.debtStatus || "unknown"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{data.studyDebt?.studyDebtPoints ?? 0} debt points</p>
          </article>

          <article className="dei-card p-5 md:col-span-2">
            <h3 className="mb-2 text-base font-semibold text-foreground">Interpretation</h3>
            <p className="text-sm text-muted-foreground">
              Debt is calculated from your graph as: days since review × (1 - mastery) × concept difficulty. Prioritize concepts in the
              decaying list with low mastery and high difficulty.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                Healthy: ≤ 50 points
              </div>
              <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                Moderate: 51 - 200 points
              </div>
              <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                High: 201 - 500 points
              </div>
              <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                Critical: {">"} 500 points
              </div>
            </div>
          </article>
        </section>
      ) : null}
    </AppFrame>
  );
}
