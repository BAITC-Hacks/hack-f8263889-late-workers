import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthStore } from "../stores/useAuthStore";

/**
 * Route guard: renders child routes while signed in, otherwise redirects to
 * /login and remembers where the user came from so login can send them back.
 */
export const RequireAuth = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
