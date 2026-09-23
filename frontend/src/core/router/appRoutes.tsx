import { ChatPage } from "@/modules/ai";
import { LoginPage, RegisterPage, RequireAuth } from "@/modules/auth";
import { ContactFormPage, HomePage } from "@/modules/dashboard";
import { NotesPage } from "@/modules/notes";
import { Outlet, type RouteObject } from "react-router-dom";

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: (
      <div className="flex min-h-screen flex-col">
        <Outlet />
      </div>
    ),
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "contact",
        element: <ContactFormPage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "register",
        element: <RegisterPage />,
      },
      {
        // Everything below needs a signed-in user; RequireAuth redirects to /login.
        element: <RequireAuth />,
        children: [
          {
            path: "notes",
            element: <NotesPage />,
          },
          {
            path: "chat",
            element: <ChatPage />,
          },
        ],
      },
    ],
  },
];
