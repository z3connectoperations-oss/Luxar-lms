import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth, homeForRole } from "../auth/AuthContext";
import type { Role } from "@luxar/shared";

/** Guards a route: requires auth and (optionally) one of `roles`. */
export function RoleRoute({
  roles,
  children,
}: {
  roles?: Role[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid h-full place-items-center text-muted">Loading…</div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }
  return <>{children}</>;
}
