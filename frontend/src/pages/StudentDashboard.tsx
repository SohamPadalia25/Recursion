import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { LearningPlan } from "@/components/dashboard/LearningPlan";
import { EventsPanel } from "@/components/dashboard/EventsPanel";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { AIBuddy } from "@/components/dashboard/AIBuddy";

const StudentDashboard = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="mb-6">
            <StatsPanel />
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
