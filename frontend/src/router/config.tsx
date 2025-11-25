import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const HomePage = lazy(() => import("../pages/home/page"));
const NotFoundPage = lazy(() => import("../pages/NotFound"));
const CareerChatPage = lazy(() => import("../pages/career-chat/page"));
const AnalysisResultPage = lazy(() => import("../pages/analysis-result/page"));
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const MentoringPage = lazy(() => import("../pages/mentoring/MentoringPage"));
const LearningPathListPage = lazy(() => import("../pages/learning/LearningPathList"));
const LearningPathDetailPage = lazy(() => import("../pages/learning/LearningPathDetail"));
const WeeklyQuizPage = lazy(() => import("../pages/learning/WeeklyQuiz"));
const DashboardPage = lazy(() => import("../pages/learning/Dashboard"));
const DeveloperExperiencePage = lazy(() => import("../pages/career-simulation/DeveloperExperience"));
const CareerSimulationResultPage = lazy(() => import("../pages/career-simulation/Result"));
const CodingTestPage = lazy(() => import("../pages/career-simulation/CodingTest"));
const MyPage = lazy(() => import("../pages/mypage/page"));
const MentorApplyPage = lazy(() => import("../pages/mentor/MentorApply"));
const AdminDashboardPage = lazy(() => import("../pages/admin/AdminDashboard"));
const MentorApplicationsPage = lazy(() => import("../pages/admin/MentorApplications"));
const MentorsListPage = lazy(() => import("../pages/mentors/MentorsList"));
const MentorDetailPage = lazy(() => import("../pages/mentors/MentorDetail"));
const MentorEditPage = lazy(() => import("../pages/mentors/MentorEdit"));
const PaymentPurchasePage = lazy(() => import("../pages/payments/PaymentPurchase"));
const PaymentHistoryPage = lazy(() => import("../pages/payments/PaymentHistory"));
const PaymentSuccessPage = lazy(() => import("../pages/payments/PaymentSuccess"));
const PaymentFailPage = lazy(() => import("../pages/payments/PaymentFail"));
const BookMentoringPage = lazy(() => import("../pages/mentoring/BookMentoring"));
const MyBookingsPage = lazy(() => import("../pages/my-bookings/page"));
const MentorSessionsPage = lazy(() => import("../pages/mentor/MentorSessions"));
const MentoringMeetingPage = lazy(() => import("../pages/mentoring/MentoringMeeting"));

const routes: RouteObject[] = [
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/career-chat",
    element: <CareerChatPage />,
  },
  {
    path: "/analysis/:sessionId",
    element: <AnalysisResultPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/mentoring",
    element: <MentoringPage />,
  },
  {
    path: "/learning",
    element: <LearningPathListPage />,
  },
  {
    path: "/learning/:pathId",
    element: <LearningPathDetailPage />,
  },
  {
    path: "/learning/:pathId/week/:weeklyId",
    element: <WeeklyQuizPage />,
  },
  {
    path: "/learning/dashboard",
    element: <DashboardPage />,
  },
  {
    path: "/career-simulation/developer",
    element: <DeveloperExperiencePage />,
  },
  {
    path: "/career-simulation/result",
    element: <CareerSimulationResultPage />,
  },
  {
    path: "/career-simulation/coding-test",
    element: <CodingTestPage />,
  },
  {
    path: "/mypage",
    element: <MyPage />,
  },
  {
    path: "/mentor/apply",
    element: <MentorApplyPage />,
  },
  {
    path: "/admin/dashboard",
    element: <AdminDashboardPage />,
  },
  {
    path: "/admin/mentor-applications",
    element: <MentorApplicationsPage />,
  },
  {
    path: "/mentors",
    element: <MentorsListPage />,
  },
  {
    path: "/mentors/:id",
    element: <MentorDetailPage />,
  },
  {
    path: "/mentors/:id/edit",
    element: <MentorEditPage />,
  },
  {
    path: "/payments/purchase",
    element: <PaymentPurchasePage />,
  },
  {
    path: "/payments/history",
    element: <PaymentHistoryPage />,
  },
  {
    path: "/payments/success",
    element: <PaymentSuccessPage />,
  },
  {
    path: "/payments/fail",
    element: <PaymentFailPage />,
  },
  {
    path: "/mentoring/book/:sessionId",
    element: <BookMentoringPage />,
  },
  {
    path: "/my-bookings",
    element: <MyBookingsPage />,
  },
  {
    path: "/mentor/sessions",
    element: <MentorSessionsPage />,
  },
  {
    path: "/mentoring/meeting/:bookingId",
    element: <MentoringMeetingPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

export default routes;
