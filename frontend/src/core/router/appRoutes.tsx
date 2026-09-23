import {
  BusinessRegisterPage,
  GuestOnly,
  LoginPage,
  ProfilePage,
  RequireAuth,
  SessionRedirect,
  StudentRegisterPage,
} from "@/modules/auth";
import { BuilderPage, NewTaskPage } from "@/modules/builder";
import {
  BusinessTasksPage,
  CatalogPage,
  SavedTasksPage,
  TaskPage,
} from "@/modules/catalog";
import {
  MyProposalsPage,
  ProposalCreatePage,
  ProposalEditPage,
} from "@/modules/proposals";
import { TeamCreatePage, TeamPage, TeamsPage } from "@/modules/teams";
import { Navigate, type RouteObject } from "react-router-dom";

export const appRoutes: RouteObject[] = [
  { path: "/", element: <SessionRedirect /> },
  {
    element: <GuestOnly />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register/business", element: <BusinessRegisterPage /> },
      { path: "/register/student", element: <StudentRegisterPage /> },
      { path: "/register/*", element: <Navigate to="/" replace /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: "/catalog", element: <CatalogPage /> },
      { path: "/catalog/:id", element: <TaskPage /> },
    ],
  },
  {
    element: <RequireAuth role="business" />,
    children: [
      { path: "/business", element: <BusinessTasksPage /> },
      { path: "/business/tasks/new", element: <NewTaskPage /> },
      { path: "/business/tasks/:id/builder", element: <BuilderPage /> },
    ],
  },
  {
    element: <RequireAuth role="student" />,
    children: [
      { path: "/student", element: <SavedTasksPage /> },
      { path: "/student/profile", element: <ProfilePage /> },
      { path: "/student/teams", element: <TeamsPage /> },
      { path: "/student/teams/new", element: <TeamCreatePage /> },
      { path: "/student/teams/:id", element: <TeamPage /> },
      { path: "/student/proposals", element: <MyProposalsPage /> },
      { path: "/student/proposals/:id/edit", element: <ProposalEditPage /> },
      { path: "/catalog/:id/proposal", element: <ProposalCreatePage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];
