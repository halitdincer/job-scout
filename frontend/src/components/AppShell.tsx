import { Link, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <nav className="container flex items-center gap-6 py-3">
          <a href="/" className="font-semibold">
            Job Scout
          </a>
          <a href="/" className="text-muted-foreground hover:text-foreground">
            Jobs
          </a>
          <Link to="/runs" className="text-muted-foreground hover:text-foreground">
            Runs
          </Link>
          <a
            href="/sources/"
            className="text-muted-foreground hover:text-foreground"
          >
            Sources
          </a>
          <a href="/admin/" className="text-muted-foreground hover:text-foreground">
            Admin
          </a>
        </nav>
      </header>
      <main className="flex-1 container py-6">
        <Outlet />
      </main>
    </div>
  );
}
