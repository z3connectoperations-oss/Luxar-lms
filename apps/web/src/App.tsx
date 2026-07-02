import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RoleRoute } from "./components/RoleRoute";
import PublicLayout from "./layouts/PublicLayout";
import PortalLayout from "./layouts/PortalLayout";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import RefundPolicy from "./pages/RefundPolicy";
import { StudentDashboard, TrainerDashboard } from "./pages/dashboards";
import MyCourses from "./pages/student/MyCourses";
import Pathway from "./pages/student/Pathway";
import LearnPlayer from "./pages/student/LearnPlayer";
import Downloads from "./pages/student/Downloads";
import Schedule from "./pages/student/Schedule";
import Notifications from "./pages/Notifications";
import Tests from "./pages/student/Tests";
import TestPlayer from "./pages/student/TestPlayer";
import TestResult from "./pages/student/TestResult";
import TrainerCourses from "./pages/trainer/TrainerCourses";
import TrainerCourseManage from "./pages/trainer/CourseManage";
import TrainerSchedule from "./pages/trainer/TrainerSchedule";
import TrainerDoubts from "./pages/trainer/TrainerDoubts";
import TrainerEvaluations from "./pages/trainer/Evaluations";
import TrainerMentorship from "./pages/trainer/TrainerMentorship";
import TrainerInterviews from "./pages/trainer/TrainerInterviews";
import StudentMentorship from "./pages/student/Mentorship";
import StudentInterview from "./pages/student/Interview";
import Purchases from "./pages/student/Purchases";
import StudentLive from "./pages/student/Live";
import TrainerLive from "./pages/trainer/TrainerLive";
import AdminCategories from "./pages/admin/Categories";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCourses from "./pages/admin/Courses";
import AdminCourseEdit from "./pages/admin/CourseEdit";
import AdminUsers from "./pages/admin/Users";
import AdminEnrollments from "./pages/admin/Enrollments";
import AdminEnrollmentDetail from "./pages/admin/EnrollmentDetail";
import AdminLeads from "./pages/admin/Leads";
import AdminExams from "./pages/admin/Exams";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public website */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:slug" element={<CourseDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
          </Route>
          <Route path="/login" element={<Navigate to="/?login=true" replace />} />
          <Route path="/signup" element={<Signup />} />
          {/* Full-screen course player (opens in a new tab) */}
          <Route path="/learn/:courseId" element={<RoleRoute><LearnPlayer /></RoleRoute>} />

          {/* Full-screen live meeting rooms (opens in a new tab) */}
          <Route path="/student/courses/:courseId/live" element={<RoleRoute roles={["student", "admin"]}><StudentLive /></RoleRoute>} />
          <Route path="/trainer/courses/:id/live" element={<RoleRoute roles={["trainer", "admin"]}><TrainerLive /></RoleRoute>} />

          {/* Student portal */}
          <Route
            element={
              <RoleRoute roles={["student", "admin"]}>
                <PortalLayout scope="student" />
              </RoleRoute>
            }
          >
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/courses" element={<MyCourses />} />
            <Route path="/student/courses/:courseId" element={<Pathway />} />
            <Route path="/student/downloads" element={<Downloads />} />
            <Route path="/student/schedule" element={<Schedule />} />
            <Route path="/student/notifications" element={<Notifications />} />
            <Route path="/student/tests" element={<Tests />} />
            <Route path="/student/tests/:testId/take" element={<TestPlayer />} />
            <Route path="/student/tests/result/:attemptId" element={<TestResult />} />
            <Route path="/student/mentorship" element={<StudentMentorship />} />
            <Route path="/student/interview" element={<StudentInterview />} />
            <Route path="/student/purchases" element={<Purchases />} />
          </Route>

          {/* Trainer portal */}
          <Route
            element={
              <RoleRoute roles={["trainer", "admin"]}>
                <PortalLayout scope="trainer" />
              </RoleRoute>
            }
          >
            <Route path="/trainer" element={<TrainerDashboard />} />
            <Route path="/trainer/courses" element={<TrainerCourses />} />
            <Route path="/trainer/courses/:id" element={<TrainerCourseManage />} />
            <Route path="/trainer/schedule" element={<TrainerSchedule />} />
            <Route path="/trainer/doubts" element={<TrainerDoubts />} />
            <Route path="/trainer/evaluations" element={<TrainerEvaluations />} />
            <Route path="/trainer/mentorship" element={<TrainerMentorship />} />
            <Route path="/trainer/interviews" element={<TrainerInterviews />} />
            <Route path="/trainer/notifications" element={<Notifications />} />
          </Route>

          {/* Admin master root */}
          <Route
            element={
              <RoleRoute roles={["admin"]}>
                <PortalLayout scope="admin" />
              </RoleRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/courses" element={<AdminCourses />} />
            <Route path="/admin/courses/:id" element={<AdminCourseEdit />} />
            <Route path="/admin/exams" element={<AdminExams />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/enrollments" element={<AdminEnrollments />} />
            <Route path="/admin/enrollments/:courseId" element={<AdminEnrollmentDetail />} />
            <Route path="/admin/leads" element={<AdminLeads />} />
            <Route path="/admin/notifications" element={<Notifications />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
