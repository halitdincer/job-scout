import { createBrowserRouter } from "react-router-dom";

import { App } from "@/App";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/lib/RequireAuth";
import { JobsPage } from "@/routes/JobsPage";
import { LoginPage } from "@/routes/LoginPage";
import { RunsPage } from "@/routes/RunsPage";
import { SourcesPage } from "@/routes/SourcesPage";

export const router = createBrowserRouter([
  {
    path: "/accounts/login",
    element: <LoginPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: "/",
            element: <JobsPage />,
          },
          {
            path: "/runs",
            element: <RunsPage />,
          },
          {
            path: "/sources",
            element: <SourcesPage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <App />,
  },
]);
