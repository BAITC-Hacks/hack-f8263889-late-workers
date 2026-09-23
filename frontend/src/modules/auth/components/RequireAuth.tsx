import { Navigate, Outlet } from "react-router-dom";

import { homeForUser } from "../helpers";
import { useAuthStore } from "../stores/useAuthStore";
import type { UserRole } from "../types";

/** Without `role`, any signed-in user passes; guests always go to login. */
export const RequireAuth = ({ role }: { role?: UserRole }) => {
  const user = useAuthStore((state) => state.user);
  if (!user || (role && user.role !== role))
    return <Navigate to={homeForUser(user)} replace />;
  return <Outlet />;
};
