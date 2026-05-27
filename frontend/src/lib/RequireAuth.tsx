import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useCurrentUser } from "@/api/auth";
import { ApiError } from "./fetcher";

function isAuthError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function RequireAuth() {
  const location = useLocation();
  const { error, isLoading } = useCurrentUser();

  if (isLoading) {
    return null;
  }

  if (isAuthError(error)) {
    const next = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/accounts/login/?next=${encodeURIComponent(next)}`}
        replace
      />
    );
  }

  return <Outlet />;
}
