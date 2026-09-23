import { Navigate, Outlet } from "react-router-dom";

import { homeForUser } from "../helpers";
import { useAuthStore } from "../stores/useAuthStore";

export const GuestOnly = () => {
  const user = useAuthStore((state) => state.user);
  return user ? <Navigate to={homeForUser(user)} replace /> : <Outlet />;
};

export const SessionRedirect = () => {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={homeForUser(user)} replace />;
};
