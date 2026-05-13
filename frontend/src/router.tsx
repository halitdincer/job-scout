import { createBrowserRouter } from "react-router-dom";

import { App } from "@/App";
import { AppShell } from "@/components/AppShell";
import { RunsPage } from "@/routes/RunsPage";
import { SourcesPage } from "@/routes/SourcesPage";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
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
  {
    path: "*",
    element: <App />,
  },
]);
