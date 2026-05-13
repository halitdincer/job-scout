import type { ColumnDefinition } from "tabulator-tables";

import type { SortSpec } from "@/api/jobs";

import { dateFormatter, titleFormatter, valuesFormatter } from "./formatters";

export const DEFAULT_JOB_SORT: SortSpec[] = [
  { field: "first_seen_at", dir: "desc" },
];

export const PAGE_SIZES = [25, 50, 100, 250] as const;

export function getJobColumns(): ColumnDefinition[] {
  return [
    {
      title: "Title",
      field: "title",
      formatter: titleFormatter,
      headerSort: true,
      minWidth: 260,
      widthGrow: 3,
    },
    {
      title: "Source",
      field: "source_name",
      headerSort: true,
      minWidth: 150,
      widthGrow: 1,
    },
    {
      title: "Department",
      field: "department",
      headerSort: true,
      minWidth: 150,
      widthGrow: 1,
    },
    {
      title: "Team",
      field: "team",
      headerSort: true,
      minWidth: 140,
      widthGrow: 1,
    },
    {
      title: "Employment",
      field: "employment_type_label",
      minWidth: 120,
      widthGrow: 1,
    },
    {
      title: "Workplace",
      field: "workplace_type_label",
      minWidth: 120,
      widthGrow: 1,
    },
    {
      title: "Locations",
      field: "locations_display",
      minWidth: 180,
      widthGrow: 2,
    },
    {
      title: "Country",
      field: "country",
      formatter: valuesFormatter,
      headerSort: true,
      minWidth: 110,
      widthGrow: 1,
    },
    {
      title: "Region",
      field: "region",
      formatter: valuesFormatter,
      headerSort: true,
      minWidth: 110,
      widthGrow: 1,
    },
    {
      title: "City",
      field: "city",
      formatter: valuesFormatter,
      headerSort: true,
      minWidth: 130,
      widthGrow: 1,
    },
    {
      title: "Published",
      field: "published_at",
      formatter: dateFormatter,
      headerSort: true,
      minWidth: 150,
      widthGrow: 1,
    },
    {
      title: "First Seen",
      field: "first_seen_at",
      formatter: dateFormatter,
      headerSort: true,
      minWidth: 150,
      widthGrow: 1,
    },
    {
      title: "Last Seen",
      field: "last_seen_at",
      formatter: dateFormatter,
      headerSort: true,
      minWidth: 150,
      widthGrow: 1,
    },
    {
      title: "External ID",
      field: "external_id",
      visible: false,
    },
    {
      title: "Status",
      field: "status",
      visible: false,
    },
    {
      title: "Updated At Source",
      field: "updated_at_source",
      formatter: dateFormatter,
      visible: false,
    },
    {
      title: "Expired",
      field: "expired_at",
      formatter: dateFormatter,
      visible: false,
    },
    {
      title: "Seen",
      field: "seen",
      visible: false,
    },
  ];
}
