import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { LearningPlan } from "@/components/dashboard/LearningPlan";
import { EventsPanel } from "@/components/dashboard/EventsPanel";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { AIBuddy } from "@/components/dashboard/AIBuddy";
import { TrendingCourses } from "@/components/dashboard/TrendingCourses";
import { Button } from "@/components/ui/button";
import { verifyCompletion } from "@/lib/certificate-api";
import { useAuth } from "@/auth/AuthContext";
import { JoinLiveSessionButton } from "@/components/dashboard/JoinLiveSessionButton";

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courseId, setCourseId] = useState("");
  const [checking, setChecking] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState("Enter a course id to check certificate eligibility.");

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
      if (result.eligible) {
        setEligibilityMessage(
          `Eligible: ${result.details.completedLectureCount}/${result.details.lectureCount} lectures completed and ${pct}% watch ratio.`
        );
      } else {
        setEligibilityMessage(
          `Not eligible yet: completed ${result.details.completedLectureCount}/${result.details.lectureCount} lectures and ${pct}% watch ratio.`
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

            <p className="mt-3 text-sm text-muted-foreground">{eligibilityMessage}</p>
          </div>

          <div className="mb-6">
            <StatsPanel />
          </div>

          <div className="mb-6">
            <TrendingCourses />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <LearningPlan />
              <ProgressChart />
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
