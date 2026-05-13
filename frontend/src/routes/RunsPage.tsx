import { useRuns } from "@/api/runs";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function twoDigits(value: number) {
  return value.toString().padStart(2, "0");
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return `${MONTHS[date.getUTCMonth()]} ${twoDigits(date.getUTCDate())}, ${date.getUTCFullYear()} ${twoDigits(date.getUTCHours())}:${twoDigits(date.getUTCMinutes())}`;
}

export function RunsPage() {
  const { data: runs = [], isLoading, isError } = useRuns();

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-normal">Ingestion Runs</h1>
        <p className="text-sm text-muted-foreground">
          Recent scraping runs and their persisted result counts.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading runs…</p>
      ) : null}

      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load ingestion runs.
        </p>
      ) : null}

      {!isLoading && !isError && runs.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
          No ingestion runs yet.
        </p>
      ) : null}

      {!isLoading && !isError && runs.length > 0 ? (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Finished</TableHead>
                <TableHead className="text-right">Sources</TableHead>
                <TableHead className="text-right">Created</TableHead>
                <TableHead className="text-right">Updated</TableHead>
                <TableHead className="text-right">Expired</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium">#{run.id}</TableCell>
                  <TableCell>
                    <StatusBadge status={run.status} />
                  </TableCell>
                  <TableCell>{formatTimestamp(run.started_at)}</TableCell>
                  <TableCell>{formatTimestamp(run.finished_at)}</TableCell>
                  <TableCell className="text-right">
                    {run.sources_processed}
                  </TableCell>
                  <TableCell className="text-right">
                    {run.listings_created}
                  </TableCell>
                  <TableCell className="text-right">
                    {run.listings_updated}
                  </TableCell>
                  <TableCell className="text-right">
                    {run.listings_expired}
                  </TableCell>
                  <TableCell className="max-w-sm truncate">
                    {run.error_message ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </section>
  );
}
