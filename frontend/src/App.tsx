import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/auth/AuthContext";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/auth/Login";
import SignupPage from "./pages/auth/Signup";
import StudentDashboardPage from "./pages/student/Dashboard";
import StudentCoursesPage from "./pages/student/Courses";
import StudentPracticePage from "./pages/student/Practice";
import StudentLecturePage from "./pages/student/Lecture";
import StudentProgressPage from "./pages/student/Progress";
import StudentToolsPage from "./pages/student/Tools";
import StudentCertificatesPage from "./pages/student/Certificates";
import StudentOnboardingPage from "./pages/student/Onboarding";
import StudentCourseDetailPage from "./pages/student/CourseDetail";
import StudentCoursePlayerPage from "./pages/student/CoursePlayer";
import StudentRoadmapPage from "./pages/student/Roadmap";
import StudentNeo4jCoursePage from "./pages/student/Neo4jCourse";
import StudentCertificateDetailPage from "./pages/student/CertificateDetail";
import VerifyCertificatePage from "./pages/VerifyCertificate";
import StudentMyNotesPage from "./pages/student/MyNotes";
import StudentInstructorVideoCallPage from "./pages/StudentInstructorVideoCall";
import InstructorLiveSessionPage from "./pages/InstructorLiveSession";
import StudentJoinSessionPage from "./pages/StudentJoinSession";
import InstructorDashboardPage from "./pages/instructor/Dashboard";
import InstructorCourseBuilderPage from "./pages/instructor/CourseBuilder";
import InstructorTeachingToolsPage from "./pages/instructor/TeachingTools";
import InstructorAnalyticsPage from "./pages/instructor/Analytics";
import InstructorQuizBuilderPage from "./pages/instructor/QuizBuilder";
import AdminDashboardPage from "./pages/admin/Dashboard";
import AdminUsersPage from "./pages/admin/Users";
import AdminAnalyticsPage from "./pages/admin/Analytics";
import AdminMonetizationPage from "./pages/admin/Monetization";
import AdminModerationPage from "./pages/admin/Moderation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify" element={<VerifyCertificatePage />} />

            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/courses"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentCoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/practice"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentPracticePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/lecture"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentLecturePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/progress"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentProgressPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/tools"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentToolsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/certificates"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentCertificatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/certificate/:hash"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentCertificateDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/notes"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentMyNotesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/onboarding"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentOnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/course/:courseId"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentCourseDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/course/:courseId/learn/:weekIdx/:lectureIdx"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentCoursePlayerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/roadmap"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentRoadmapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/roadmap/course/:id"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentNeo4jCoursePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/live-session"
              element={
                <ProtectedRoute allowedRoles={["student", "instructor"]}>
                  <StudentInstructorVideoCallPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/live-session"
              element={
                <ProtectedRoute allowedRoles={["instructor"]}>
                  <InstructorLiveSessionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/join-session"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentJoinSessionPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/instructor"
              element={
                <ProtectedRoute allowedRoles={["instructor"]}>
                  <InstructorDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/course-builder"
              element={
                <ProtectedRoute allowedRoles={["instructor"]}>
                  <InstructorCourseBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/teaching-tools"
              element={
                <ProtectedRoute allowedRoles={["instructor"]}>
                  <InstructorTeachingToolsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/analytics"
              element={
                <ProtectedRoute allowedRoles={["instructor"]}>
                  <InstructorAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/quiz-builder"
              element={
                <ProtectedRoute allowedRoles={["instructor"]}>
                  <InstructorQuizBuilderPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/monetization"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminMonetizationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/moderation"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminModerationPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
