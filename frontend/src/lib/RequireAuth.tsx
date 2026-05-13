import { Navigate, Outlet, useLocation } from "react-router-dom";

import { ApiError } from "./fetcher";

function isAuthError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function RequireAuth({ error }: { error?: unknown }) {
  const location = useLocation();

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
