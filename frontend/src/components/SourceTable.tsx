import type { Source } from "@/types/api";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PLATFORM_LABELS: Record<string, string> = {
  ashby: "Ashby",
  bamboohr: "BambooHR",
  greenhouse: "Greenhouse",
  jibe: "Jibe",
  lever: "Lever",
  phenom: "Phenom People",
  workday: "Workday",
};

function SourceStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        active ? "bg-green-100 text-green-900" : "bg-muted text-muted-foreground",
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function SourceTable({ sources }: { sources: Source[] }) {
  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Board ID</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source) => (
            <TableRow key={source.id}>
              <TableCell className="font-medium">{source.name}</TableCell>
              <TableCell>
                {PLATFORM_LABELS[source.platform] ?? source.platform}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {source.board_id}
              </TableCell>
              <TableCell>
                <SourceStatusBadge active={source.is_active} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
