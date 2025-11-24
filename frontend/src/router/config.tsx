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
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const MentoringPage = lazy(() => import("../pages/mentoring/page"));
const MentoringRoomPage = lazy(() => import("../pages/mentoring/room"));
const LearningPathListPage = lazy(() => import("../pages/learning/LearningPathList"));
const LearningPathDetailPage = lazy(() => import("../pages/learning/LearningPathDetail"));
const WeeklyQuizPage = lazy(() => import("../pages/learning/WeeklyQuiz"));
const DashboardPage = lazy(() => import("../pages/learning/Dashboard"));
const DeveloperExperiencePage = lazy(() => import("../pages/career-simulation/DeveloperExperience"));
const CareerSimulationResultPage = lazy(() => import("../pages/career-simulation/Result"));
const CodingTestPage = lazy(() => import("../pages/career-simulation/CodingTest"));

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
    path: "/mentoring/room",
    element: <MentoringRoomPage />,
  },

  /* ----------------------
     🔹 PROFILE (HEAD)
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
     🔹 LEARNING PATH (dev)
     ---------------------- */
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
    path: "/learning/:pathId/dashboard",
    element: <DashboardPage />,
  },

  /* ----------------------
     🔹 CAREER SIMULATION (dev)
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

  /* 마지막 NotFound */
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

export default routes;
