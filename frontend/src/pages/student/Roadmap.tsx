import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";
import RoadmapGraph, { type RoadmapLink, type RoadmapNode } from "@/components/roadmap/RoadmapGraph";

type GraphResponse = {
  nodes: RoadmapNode[];
  links: RoadmapLink[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function StudentRoadmapPage() {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <AppFrame
      roleLabel="Student"
      title="AI Learning Roadmap"
      subtitle="Explore the Artificial Intelligence graph and open any course node for details."
      navItems={studentNav}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="dei-card p-4">
          <p className="text-xs text-muted-foreground">Total Nodes</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.total}</p>
        </article>
        <article className="dei-card p-4">
          <p className="text-xs text-muted-foreground">Categories</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{stats.categories}</p>
        </article>
        <article className="dei-card p-4">
          <p className="text-xs text-muted-foreground">Courses</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.courses}</p>
        </article>
      </div>

      <section className="mt-5">
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
    </AppFrame>
  );
}
