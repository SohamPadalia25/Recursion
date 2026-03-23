import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppFrame } from "@/components/platform/AppFrame";
import { Button } from "@/components/ui/button";
import { studentNav } from "../roleNav";

type Neo4jCourse = {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  duration: string;
  parentCategory: string | null;
  metadata: Record<string, unknown>;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function StudentNeo4jCoursePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Neo4jCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourse() {
      if (!id) {
        setError("Missing course id");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/course/${id}`);

        if (!response.ok) {
          throw new Error("Failed to fetch course details");
        }

        const data: Neo4jCourse = await response.json();
        setCourse(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [id]);

  return (
    <AppFrame
      roleLabel="Student"
      title="Roadmap Course"
      subtitle="Details for a course selected from the Neo4j learning graph."
      navItems={studentNav}
    >
      <div className="mb-4">
        <Button variant="outline" className="rounded-xl" onClick={() => navigate("/student/roadmap")}>Back to Roadmap</Button>
      </div>

      {loading ? <div className="dei-card p-6 text-sm text-muted-foreground">Loading course...</div> : null}
      {error ? <div className="dei-card p-6 text-sm text-destructive">{error}</div> : null}

      {course ? (
        <section className="dei-card p-6">
          <h2 className="text-2xl font-bold text-foreground">{course.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Difficulty</p>
              <p className="text-sm font-semibold text-foreground">{course.difficulty}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-sm font-semibold text-foreground">{course.duration}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Parent Category</p>
              <p className="text-sm font-semibold text-foreground">{course.parentCategory || "N/A"}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Metadata</p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
              {JSON.stringify(course.metadata, null, 2)}
            </pre>
          </div>
        </section>
      ) : null}
    </AppFrame>
  );
}
