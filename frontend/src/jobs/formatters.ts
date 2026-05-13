import type { CellComponent } from "tabulator-tables";

import type { EmploymentType, JobListing, WorkplaceType } from "@/types/api";

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

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
  temporary: "Temporary",
  unknown: "Unknown",
};

const WORKPLACE_LABELS: Record<WorkplaceType, string> = {
  on_site: "On-site",
  remote: "Remote",
  hybrid: "Hybrid",
  unknown: "Unknown",
};

function twoDigits(value: number) {
  return value.toString().padStart(2, "0");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return `${MONTHS[date.getUTCMonth()]} ${twoDigits(date.getUTCDate())}, ${date.getUTCFullYear()} ${twoDigits(date.getUTCHours())}:${twoDigits(date.getUTCMinutes())}`;
}

export function formatLink(title: string, url: string, seen = false) {
  const className = seen ? "job-link seen-link" : "job-link";
  return `<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>`;
}

export function joinValues(values: string[] | null | undefined) {
  return values && values.length > 0 ? values.join(", ") : "";
}

export type JobGridRow = Omit<JobListing, "department" | "team"> & {
  department: string;
  team: string;
  locations_display: string;
  employment_type_label: string;
  workplace_type_label: string;
};

export function mapJobRow(row: JobListing): JobGridRow {
  return {
    ...row,
    department: row.department ?? "",
    team: row.team ?? "",
    locations_display: row.locations.map((location) => location.name).join(", "),
    employment_type_label: row.employment_type
      ? EMPLOYMENT_LABELS[row.employment_type]
      : "",
    workplace_type_label: row.workplace_type
      ? WORKPLACE_LABELS[row.workplace_type]
      : "",
  };
}

export function titleFormatter(cell: CellComponent) {
  const row = cell.getRow().getData() as JobGridRow;
  return formatLink(String(cell.getValue() ?? ""), row.url, row.seen);
}

export function dateFormatter(cell: CellComponent) {
  return formatDateTime(cell.getValue() as string | null | undefined);
}

export function valuesFormatter(cell: CellComponent) {
  return joinValues(cell.getValue() as string[] | null | undefined);
}
