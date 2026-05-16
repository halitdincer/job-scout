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

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return `${MONTHS[date.getUTCMonth()]} ${twoDigits(date.getUTCDate())}, ${date.getUTCFullYear()} ${twoDigits(date.getUTCHours())}:${twoDigits(date.getUTCMinutes())}`;
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
