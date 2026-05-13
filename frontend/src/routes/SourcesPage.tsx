import { useSources } from "@/api/sources";
import { SourceTable } from "@/components/SourceTable";

export function SourcesPage() {
  const { data: sources = [], isLoading, isError } = useSources();

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-normal">Sources</h1>
        <p className="text-sm text-muted-foreground">
          Configured job boards used by the scraper.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading sources…</p>
      ) : null}

      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load sources.
        </p>
      ) : null}

      {!isLoading && !isError && sources.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
          No sources configured.
        </p>
      ) : null}

      {!isLoading && !isError && sources.length > 0 ? (
        <SourceTable sources={sources} />
      ) : null}
    </section>
  );
}
