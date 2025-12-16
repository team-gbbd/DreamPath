import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const ProfileDashboardPage = lazy(() => import("../pages/profile/Dashboard"));
const HomePage = lazy(() => import("../pages/home/page"));
const NotFoundPage = lazy(() => import("../pages/NotFound"));
const CareerChatPage = lazy(() => import("../pages/career-chat/page"));
const JobListingsPage = lazy(() => import("../pages/job-listings/page"));
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const MentoringPage = lazy(() => import("../pages/mentoring/MentoringPage"));
const ChatbotPage = lazy(() => import("../pages/chatbot/ChatbotPage"));
const LearningPathDetailPage = lazy(() => import("../pages/learning/LearningPathDetail"));
const WeeklyQuizPage = lazy(() => import("../pages/learning/WeeklyQuiz"));
const LearningDashboardPage = lazy(() => import("../pages/learning/Dashboard"));
const AIAgentDashboardPage = lazy(() => import("../pages/ai-agent/Dashboard"));
const CompanyListPage = lazy(() => import("../pages/company/CompanyListPage"));
const CompanyDetailPage = lazy(() => import("../pages/company/CompanyDetailPage"));
const CrawlerPage = lazy(() => import("../pages/admin/CrawlerPage"));
const MentorApplicationsPage = lazy(() => import("../pages/admin/MentorApplications"));
const FaqManagementPage = lazy(() => import("../pages/admin/FaqManagement"));
const InquiriesManagementPage = lazy(() => import("../pages/admin/InquiriesManagement"));
const UserManagementPage = lazy(() => import("../pages/admin/UserManagement"));
const MentorManagementPage = lazy(() => import("../pages/admin/MentorManagement"));
const AdminPage = lazy(() => import("../pages/admin/AdminPage.tsx"));
const PaymentPurchasePage = lazy(() => import("../pages/payments/PaymentPurchase"));
const PaymentHistoryPage = lazy(() => import("../pages/payments/PaymentHistory"));
const PaymentSuccessPage = lazy(() => import("../pages/payments/PaymentSuccess"));
const PaymentFailPage = lazy(() => import("../pages/payments/PaymentFail"));
const BookMentoringPage = lazy(() => import("../pages/mentoring/BookMentoring"));
const MentoringMeetingPage = lazy(() => import("../pages/mentoring/MentoringMeeting"));
const JobAnalysisPage = lazy(() => import("../pages/job-analysis/JobAnalysisPage"));
const PersonalizedInsightsPage = lazy(() => import("../pages/job-analysis/PersonalizedInsightsPage"));
const JobRecommendationsPage = lazy(() => import("../pages/job-recommendations/ComprehensiveJobPage"));
const CompanyTalentPage = lazy(() => import("../pages/company-talent/CompanyTalentPage"));
const MainLayout = lazy(() => import("../components/layout/MainLayout"));

const routes: RouteObject[] = [
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/home",
    element: <HomePage />,
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
    path: "/career-chat",
    element: <MainLayout showFooter={false}><CareerChatPage /></MainLayout>,
  },
  {
    path: "/job-listings",
    element: <MainLayout><JobListingsPage /></MainLayout>,
  },
  {
    path: "/mentoring",
    element: <MainLayout><MentoringPage /></MainLayout>,
  },
  {
    path: "/chatbot",
    element: <MainLayout showFooter={false}><ChatbotPage /></MainLayout>,
  },

  {
    path: "/profile/dashboard",
    element: <MainLayout><ProfileDashboardPage /></MainLayout>,
  },

  {
    path: "/learning",
    element: <MainLayout><LearningDashboardPage /></MainLayout>,
  },
  {
    path: "/learning/:pathId",
    element: <MainLayout><LearningPathDetailPage /></MainLayout>,
  },
  {
    path: "/learning/:pathId/week/:weeklyId",
    element: <MainLayout showFooter={false}><WeeklyQuizPage /></MainLayout>,
  },

  {
    path: "/ai-agent",
    element: <MainLayout><AIAgentDashboardPage /></MainLayout>,
  },

  {
    path: "/company-list",
    element: <MainLayout><CompanyListPage /></MainLayout>,
  },
  {
    path: "/company/:id",
    element: <MainLayout><CompanyDetailPage /></MainLayout>,
  },

  {
    path: "/job-analysis",
    element: <MainLayout><JobAnalysisPage /></MainLayout>,
  },
  {
    path: "/job-analysis/personalized",
    element: <MainLayout><PersonalizedInsightsPage /></MainLayout>,
  },
  {
    path: "/job-recommendations",
    element: <MainLayout><JobRecommendationsPage /></MainLayout>,
  },

  {
    path: "/company-talent",
    element: <MainLayout><CompanyTalentPage /></MainLayout>,
  },

  {
    path: "/mentoring/book/:sessionId",
    element: <MainLayout><BookMentoringPage /></MainLayout>,
  },
  {
    path: "/mentoring/meeting/:bookingId",
    element: <MainLayout showFooter={false}><MentoringMeetingPage /></MainLayout>,
  },

  {
    path: "/payments/purchase",
    element: <MainLayout><PaymentPurchasePage /></MainLayout>,
  },
  {
    path: "/payments/history",
    element: <MainLayout><PaymentHistoryPage /></MainLayout>,
  },
  {
    path: "/payments/success",
    element: <MainLayout><PaymentSuccessPage /></MainLayout>,
  },
  {
    path: "/payments/fail",
    element: <MainLayout><PaymentFailPage /></MainLayout>,
  },

  {
    path: "/admin",
    element: <MainLayout><AdminPage /></MainLayout>,
  },
  {
    path: "/admin/mentor-applications",
    element: <MainLayout><MentorApplicationsPage /></MainLayout>,
  },
  {
    path: "/admin/crawler",
    element: <MainLayout><CrawlerPage /></MainLayout>,
  },
  {
    path: "/admin/faq",
    element: <MainLayout><FaqManagementPage /></MainLayout>,
  },
  {
    path: "/admin/inquiries",
    element: <MainLayout><InquiriesManagementPage /></MainLayout>,
  },
  {
    path: "/admin/users",
    element: <MainLayout><UserManagementPage /></MainLayout>,
  },
  {
    path: "/admin/mentors",
    element: <MainLayout><MentorManagementPage /></MainLayout>,
  },

  {
    path: "*",
    element: <NotFoundPage />,
  },
];

export default routes;
