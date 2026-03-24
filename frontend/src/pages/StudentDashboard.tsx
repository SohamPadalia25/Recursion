import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { LearningPlan } from "@/components/dashboard/LearningPlan";
import { EventsPanel } from "@/components/dashboard/EventsPanel";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { AIBuddy } from "@/components/dashboard/AIBuddy";
import { TrendingCourses } from "@/components/dashboard/TrendingCourses";
import { MyLearningBadges } from "@/components/dashboard/MyLearningBadges";
import { Button } from "@/components/ui/button";
import { verifyCompletion } from "@/lib/certificate-api";
import { useAuth } from "@/auth/AuthContext";
import { JoinLiveSessionButton } from "@/components/dashboard/JoinLiveSessionButton";
import { getMyLearning, type Enrollment } from "@/lib/course-api";
import { getStudentProgressGraph, type StudentProgressGraph } from "@/lib/neo4j-api";
import { ProgressGraphViz } from "@/components/ProgressGraphViz";

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courseId, setCourseId] = useState("");
  const [checking, setChecking] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState("Enter a course id to check certificate eligibility.");
  const [myLearning, setMyLearning] = useState<Enrollment[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [learningPlanCourseId, setLearningPlanCourseId] = useState("");
  const [graphData, setGraphData] = useState<StudentProgressGraph | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const enrollments = await getMyLearning();
        if (mounted) setMyLearning(enrollments || []);
      } catch {
        if (mounted) setMyLearning([]);
      } finally {
        if (mounted) setLoadingCourses(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadGraph = async () => {
      setGraphLoading(true);
      try {
        const data = await getStudentProgressGraph();
        if (!mounted) return;
        setGraphData(data);
      } catch {
        if (!mounted) return;
        setGraphData(null);
      } finally {
        if (mounted) setGraphLoading(false);
      }
    };

    void loadGraph();
    return () => {
      mounted = false;
    };
  }, []);

  const learningPlanEnrollments = useMemo(
    () =>
      myLearning.map((e) => ({
        id: e.course?._id || "",
        title: e.course?.title || "Course",
      })).filter((o) => o.id),
    [myLearning]
  );

  useEffect(() => {
    if (!learningPlanCourseId && learningPlanEnrollments.length > 0) {
      setLearningPlanCourseId(learningPlanEnrollments[0].id);
    }
  }, [learningPlanCourseId, learningPlanEnrollments]);

  const handleLearningPlanCourse = useCallback((id: string) => {
    setLearningPlanCourseId(id);
  }, []);

  const summary = useMemo(() => {
    const totalCourses = myLearning.length;
    const completedCourses = myLearning.filter((entry) => entry.isCompleted).length;
    const avgCompletion =
      totalCourses > 0
        ? Math.round(myLearning.reduce((sum, entry) => sum + (entry.completionPercentage || 0), 0) / totalCourses)
        : 0;

    return { totalCourses, completedCourses, avgCompletion };
  }, [myLearning]);

  const onCheckEligibility = async () => {
    if (!courseId.trim()) {
      setEligibilityMessage("Please enter a course id.");
      return;
    }

    setChecking(true);
    setEligible(false);
    setEligibilityMessage("Checking completion status...");

    try {
      const result = await verifyCompletion(courseId.trim(), user?.email);
      setEligible(result.eligible);

      const pct = (result.details.watchRatio * 100).toFixed(1);
      const quizPart =
        typeof result.details.requiredQuizCount === "number"
          ? ` Quizzes passed: ${result.details.passedRequiredQuizCount || 0}/${result.details.requiredQuizCount}.`
          : "";
      if (result.eligible) {
        setEligibilityMessage(
          `Eligible: ${result.details.completedLectureCount}/${result.details.lectureCount} lectures completed and ${pct}% watch ratio.${quizPart}`
        );
      } else {
        setEligibilityMessage(
          `Not eligible yet: completed ${result.details.completedLectureCount}/${result.details.lectureCount} lectures and ${pct}% watch ratio.${quizPart}`
        );
      }
    } catch (error) {
      setEligibilityMessage(error instanceof Error ? error.message : "Unable to verify completion.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="mb-4">
            <JoinLiveSessionButton />
          </div>

          <div className="mb-6 rounded-2xl border border-border bg-card p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Certificate Eligibility</h2>
                <p className="text-sm text-muted-foreground">Get your certificate only after verified completion.</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="Enter course id"
                className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring-2"
              />
              <Button className="rounded-xl" onClick={onCheckEligibility} disabled={checking}>
                {checking ? "Checking..." : "Check Eligibility"}
              </Button>
              {eligible && (
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => navigate(`/student/certificates?courseId=${encodeURIComponent(courseId.trim())}`)}
                >
                  Get Certificate
                </Button>
              )}
            </div>

            <div className="mt-3 rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Course IDs</p>
              {loadingCourses ? (
                <p className="mt-1 text-sm text-muted-foreground">Loading enrolled courses...</p>
              ) : myLearning.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">No enrolled courses found.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {myLearning.slice(0, 8).map((entry) => {
                    const id = entry.course?._id || "";
                    return (
                      <div key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-1">{entry.course?.title || "Course"}</p>
                          <p className="text-xs text-muted-foreground break-all">ID: {id}</p>
                        </div>
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setCourseId(id)}>
                          Use ID
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{eligibilityMessage}</p>
          </div>

          <div className="mb-6">
            <StatsPanel />
          </div>

          <div className="mb-6">
            <MyLearningBadges />
          </div>

          <div className="mb-6">
            <TrendingCourses />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <LearningPlan
                enrollments={learningPlanEnrollments}
                selectedCourseId={learningPlanCourseId}
                onSelectCourse={handleLearningPlanCourse}
              />
              <ProgressChart />

              <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Knowledge Graph Progress</h3>
                    <p className="text-sm text-muted-foreground">Live graph of courses, modules, and topic completion.</p>
                  </div>
                  <Button variant="outline" className="rounded-xl" onClick={() => navigate("/student/neo4j-insights")}>Open Full Graph</Button>
                </div>

                {graphLoading ? (
                  <p className="text-sm text-muted-foreground">Loading graph...</p>
                ) : graphData ? (
                  <ProgressGraphViz data={graphData} height={320} />
                ) : (
                  <p className="text-sm text-muted-foreground">Graph unavailable right now.</p>
                )}
              </section>
            </div>

            <div>
              <EventsPanel />
            </div>
          </div>
        </main>
      </div>

      <AIBuddy />
    </div>
  );
};

export default StudentDashboard;
