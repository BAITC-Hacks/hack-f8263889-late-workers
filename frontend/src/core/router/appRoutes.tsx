import {
  BusinessRegisterPage,
  CabinetPage,
  GuestOnly,
  LoginPage,
  RequireAuth,
  SessionRedirect,
  StudentRegisterPage,
} from "@/modules/auth";
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
    element: <RequireAuth role="business" />,
    children: [{ path: "/business/*", element: <CabinetPage /> }],
  },
  {
    element: <RequireAuth role="student" />,
    children: [{ path: "/student/*", element: <CabinetPage /> }],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];
