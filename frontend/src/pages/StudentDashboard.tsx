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
import { JoinLiveSessionButton } from "@/components/dashboard/JoinLiveSessionButton";
import { getMyLearning, type Enrollment } from "@/lib/course-api";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [myLearning, setMyLearning] = useState<Enrollment[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [learningPlanCourseId, setLearningPlanCourseId] = useState("");

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

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="mb-4">
            <JoinLiveSessionButton />
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
