import type { JobListing } from "@/types/api";

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

const RELATIVE_UNITS = [
  { suffix: "y", seconds: 365 * 24 * 60 * 60 },
  { suffix: "mo", seconds: 30 * 24 * 60 * 60 },
  { suffix: "w", seconds: 7 * 24 * 60 * 60 },
  { suffix: "d", seconds: 24 * 60 * 60 },
  { suffix: "h", seconds: 60 * 60 },
  { suffix: "m", seconds: 60 },
] as const;

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return `${MONTHS[date.getUTCMonth()]} ${twoDigits(date.getUTCDate())}, ${date.getUTCFullYear()} ${twoDigits(date.getUTCHours())}:${twoDigits(date.getUTCMinutes())}`;
}

export function formatRelativeDateTime(
  value: string | null | undefined,
  now = new Date(),
) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const unit = RELATIVE_UNITS.find((item) => absSeconds >= item.seconds);
  if (!unit) {
    return "now";
  }
  const amount = Math.floor(absSeconds / unit.seconds);
  return diffSeconds >= 0
    ? `${amount}${unit.suffix} ago`
    : `in ${amount}${unit.suffix}`;
}

export function joinValues(values: string[] | null | undefined) {
  return values && values.length > 0 ? values.join(", ") : "";
}

export type JobGridRow = JobListing & {
  locations_display: string;
};

export function mapJobRow(row: JobListing): JobGridRow {
  return {
    ...row,
    locations_display: row.locations.map((location) => location.name).join(", "),
  };
}
