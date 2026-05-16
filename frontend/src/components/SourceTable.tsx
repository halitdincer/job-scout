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
    <div className="responsive-data-table rounded-md md:border md:border-border">
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
              <TableCell data-label="Name" className="font-medium">
                {source.name}
              </TableCell>
              <TableCell data-label="Platform">
                {PLATFORM_LABELS[source.platform] ?? source.platform}
              </TableCell>
              <TableCell
                data-label="Board ID"
                className="break-all font-mono text-xs md:break-normal"
              >
                {source.board_id}
              </TableCell>
              <TableCell data-label="Status">
                <SourceStatusBadge active={source.is_active} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
