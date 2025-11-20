import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

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
    path: "*",
    element: <NotFoundPage />,
  },
];

export default routes;
