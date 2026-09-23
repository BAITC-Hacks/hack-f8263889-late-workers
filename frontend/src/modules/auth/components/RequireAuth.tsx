import { Navigate, Outlet } from "react-router-dom";

import { homeForUser } from "../helpers";
import { useAuthStore } from "../stores/useAuthStore";
import type { UserRole } from "../types";

export const RequireAuth = ({ role }: { role: UserRole }) => {
  const user = useAuthStore((state) => state.user);
  if (!user || user.role !== role)
    return <Navigate to={homeForUser(user)} replace />;
  return <Outlet />;
};
