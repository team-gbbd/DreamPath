import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const HomePage = lazy(() => import("../pages/home/page"));
const NotFoundPage = lazy(() => import("../pages/NotFound"));
const VideoInterviewPage = lazy(() => import("../pages/video-interview/page"));
const CareerChatPage = lazy(() => import("../pages/career-chat/page"));
const AnalysisResultPage = lazy(() => import("../pages/analysis-result/page"));

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
    path: "/video-interview",
    element: <VideoInterviewPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

export default routes;
