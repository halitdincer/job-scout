import { createBrowserRouter } from "react-router-dom";

import { App } from "@/App";
import { AppShell } from "@/components/AppShell";
import { RunsPage } from "@/routes/RunsPage";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        path: "/runs",
        element: <RunsPage />,
      },
    ],
  },
  {
    path: "*",
    element: <App />,
  },
]);
