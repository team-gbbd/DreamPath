import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import ProfileInputPage from "@/pages/profile/ProfileInputPage";
import VectorStatusPage from "@/pages/profile/VectorStatusPage";
import JobRecommend from "@/pages/profile/JobRecommend";
import RecruitRecommend from "@/pages/profile/RecruitRecommend";
import MajorRecommend from "@/pages/profile/MajorRecommend";
import SchoolRecommend from "@/pages/profile/SchoolRecommend";

const ProfileDashboardPage = lazy(() => import("../pages/profile/Dashboard"));
const ProfileSuccessPage = lazy(() => import("../pages/profile/ProfileSubmitSuccess"));
const HomePage = lazy(() => import("../pages/home/page"));
const NotFoundPage = lazy(() => import("../pages/NotFound"));
const CareerChatPage = lazy(() => import("../pages/career-chat/page"));
const AnalysisResultPage = lazy(() => import("../pages/analysis-result/page"));
const JobListingsPage = lazy(() => import("../pages/job-listings/page"));
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const MentoringPage = lazy(() => import("../pages/mentoring/MentoringPage"));
const ChatbotPage = lazy(() => import("../pages/chatbot/ChatbotPage"));
const LearningPathDetailPage = lazy(() => import("../pages/learning/LearningPathDetail"));
const WeeklyQuizPage = lazy(() => import("../pages/learning/WeeklyQuiz"));
const LearningDashboardPage = lazy(() => import("../pages/learning/Dashboard"));
const DeveloperExperiencePage = lazy(() => import("../pages/career-simulation/DeveloperExperience"));
const CareerSimulationResultPage = lazy(() => import("../pages/career-simulation/Result"));
const CodingTestPage = lazy(() => import("../pages/career-simulation/CodingTest"));
const AIAgentDashboardPage = lazy(() => import("../pages/ai-agent/Dashboard"));
const CompanyListPage = lazy(() => import("../pages/company/CompanyListPage"));
const CompanyDetailPage = lazy(() => import("../pages/company/CompanyDetailPage"));
const CrawlerPage = lazy(() => import("../pages/admin/CrawlerPage"));
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
const MentoringMeetingPage = lazy(() => import("../pages/mentoring/MentoringMeeting"));
const JobAnalysisPage = lazy(() => import("../pages/job-analysis/JobAnalysisPage"));
const PersonalizedInsightsPage = lazy(() => import("../pages/job-analysis/PersonalizedInsightsPage"));
const JobRecommendationsPage = lazy(() => import("../pages/job-recommendations/JobRecommendationsPage"));
const JobWithRequirementsPage = lazy(() => import("../pages/job-recommendations/JobWithRequirementsPage"));
const CertificationsPage = lazy(() => import("../pages/certifications/CertificationsPage"));

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
    path: "/job-listings",
    element: <JobListingsPage />,
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
    path: "/chatbot",
    element: <ChatbotPage />,
  },

  /* ----------------------
     PROFILE
     ---------------------- */
  {
    path: "/profile/input",
    element: <ProfileInputPage />,
  },
  {
    path: "/profile/success",
    element: <ProfileSuccessPage />,
  },
  {
    path: "/profile/dashboard",
    element: <ProfileDashboardPage />,
  },
  {
    path: "/profile/vector-status",
    element: <VectorStatusPage />,
  },
  {
    path: "/profile/recommend",
    element: <JobRecommend />,
  },
  {
    path: "/profile/recommend/worknet",
    element: <RecruitRecommend />,
  },
  {
    path: "/profile/recommend/majors",
    element: <MajorRecommend />,
  },
  {
    path: "/profile/recommend/schools",
    element: <SchoolRecommend />,
  },

  /* ----------------------
     LEARNING PATH
     ---------------------- */
  {
    path: "/learning",
    element: <LearningDashboardPage />,
  },
  {
    path: "/learning/:pathId",
    element: <LearningPathDetailPage />,
  },
  {
    path: "/learning/:pathId/week/:weeklyId",
    element: <WeeklyQuizPage />,
  },

  /* ----------------------
     CAREER SIMULATION
     ---------------------- */
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

  /* ----------------------
     AI AGENT
     ---------------------- */
  {
    path: "/ai-agent",
    element: <AIAgentDashboardPage />,
  },

  /* ----------------------
     COMPANY INFO
     ---------------------- */
  {
    path: "/company-list",
    element: <CompanyListPage />,
  },
  {
    path: "/company/:id",
    element: <CompanyDetailPage />,
  },

  /* ----------------------
     JOB ANALYSIS & RECOMMENDATIONS
     ---------------------- */
  {
    path: "/job-analysis",
    element: <JobAnalysisPage />,
  },
  {
    path: "/job-analysis/personalized",
    element: <PersonalizedInsightsPage />,
  },
  {
    path: "/job-recommendations",
    element: <JobRecommendationsPage />,
  },

  /* ----------------------
     MYPAGE
     ---------------------- */
  {
    path: "/mypage",
    element: <MyPage />,
  },

  /* ----------------------
     MENTOR
     ---------------------- */
  {
    path: "/mentor/apply",
    element: <MentorApplyPage />,
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

  /* ----------------------
     MENTORING
     ---------------------- */
  {
    path: "/mentoring/book/:sessionId",
    element: <BookMentoringPage />,
  },
  {
    path: "/mentoring/meeting/:bookingId",
    element: <MentoringMeetingPage />,
  },
  {
    path: "/my-bookings",
    element: <MyBookingsPage />,
  },

  /* ----------------------
     PAYMENTS
     ---------------------- */
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

  /* ----------------------
     ADMIN
     ---------------------- */
  {
    path: "/admin/dashboard",
    element: <AdminDashboardPage />,
  },
  {
    path: "/admin/mentor-applications",
    element: <MentorApplicationsPage />,
  },
  {
    path: "/admin/crawler",
    element: <CrawlerPage />,
  },

  /* ----------------------
     NOT FOUND
     ---------------------- */
  {
    path: "*",
    element: <NotFoundPage />,
  },
  {
    path: "/chatbot",
    element: <ChatbotPage />,
  },
  {
    path: "/job-analysis",
    element: <JobAnalysisPage />,
  },
  {
    path: "/job-analysis/personalized",
    element: <PersonalizedInsightsPage />,
  },
  {
    path: "/job-recommendations",
    element: <JobRecommendationsPage />,
  },
  {
    path: "/job-recommendations/with-requirements",
    element: <JobWithRequirementsPage />,
  },
  /* ----------------------
     🔹 CERTIFICATIONS (Q-net)
     ---------------------- */
  {
    path: "/certifications",
    element: <CertificationsPage />,
  },
];

export default routes;
