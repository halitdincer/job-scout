import type { ColumnDef } from "@tanstack/react-table";

import type { SortSpec } from "@/api/jobs";

import { formatDateTime, joinValues, type JobGridRow } from "./formatters";

export const DEFAULT_JOB_SORT: SortSpec[] = [
  { field: "first_seen_at", dir: "desc" },
];

export const PAGE_SIZES = [25, 50, 100, 250] as const;

export type JobColumnMeta = {
  minWidth?: string;
  defaultVisible?: boolean;
};

export type JobColumnDef = ColumnDef<JobGridRow> & {
  meta?: JobColumnMeta;
};

type CellContext<TValue> = { getValue: () => TValue };

function dateCellRenderer({ getValue }: CellContext<unknown>) {
  return formatDateTime(getValue() as string | null | undefined);
}

function valuesCellRenderer({ getValue }: CellContext<unknown>) {
  return joinValues(getValue() as string[] | null | undefined);
}

export function getJobColumns(): JobColumnDef[] {
  return [
    {
      id: "title",
      accessorKey: "title",
      header: "Title",
      enableSorting: true,
      cell: ({ row }) => {
        const { title, url, seen } = row.original;
        return (
          <a
            className={seen ? "job-link seen-link" : "job-link"}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {title}
          </a>
        );
      },
      meta: { minWidth: "260px", defaultVisible: true },
    },
    {
      id: "source_name",
      accessorKey: "source_name",
      header: "Source",
      enableSorting: true,
      meta: { minWidth: "150px", defaultVisible: true },
    },
    {
      id: "department",
      accessorKey: "department",
      header: "Department",
      enableSorting: true,
      meta: { minWidth: "150px", defaultVisible: true },
    },
    {
      id: "team",
      accessorKey: "team",
      header: "Team",
      enableSorting: true,
      meta: { minWidth: "140px", defaultVisible: true },
    },
    {
      id: "employment_type_label",
      accessorKey: "employment_type_label",
      header: "Employment",
      enableSorting: false,
      meta: { minWidth: "120px", defaultVisible: true },
    },
    {
      id: "workplace_type_label",
      accessorKey: "workplace_type_label",
      header: "Workplace",
      enableSorting: false,
      meta: { minWidth: "120px", defaultVisible: true },
    },
    {
      id: "locations_display",
      accessorKey: "locations_display",
      header: "Locations",
      enableSorting: false,
      meta: { minWidth: "180px", defaultVisible: true },
    },
    {
      id: "country",
      accessorKey: "country",
      header: "Country",
      enableSorting: true,
      cell: valuesCellRenderer,
      meta: { minWidth: "110px", defaultVisible: true },
    },
    {
      id: "region",
      accessorKey: "region",
      header: "Region",
      enableSorting: true,
      cell: valuesCellRenderer,
      meta: { minWidth: "110px", defaultVisible: true },
    },
    {
      id: "city",
      accessorKey: "city",
      header: "City",
      enableSorting: true,
      cell: valuesCellRenderer,
      meta: { minWidth: "130px", defaultVisible: true },
    },
    {
      id: "published_at",
      accessorKey: "published_at",
      header: "Published",
      enableSorting: true,
      cell: dateCellRenderer,
      meta: { minWidth: "150px", defaultVisible: true },
    },
    {
      id: "first_seen_at",
      accessorKey: "first_seen_at",
      header: "First Seen",
      enableSorting: true,
      cell: dateCellRenderer,
      meta: { minWidth: "150px", defaultVisible: true },
    },
    {
      id: "last_seen_at",
      accessorKey: "last_seen_at",
      header: "Last Seen",
      enableSorting: true,
      cell: dateCellRenderer,
      meta: { minWidth: "150px", defaultVisible: true },
    },
    {
      id: "external_id",
      accessorKey: "external_id",
      header: "External ID",
      enableSorting: false,
      meta: { defaultVisible: false },
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      meta: { defaultVisible: false },
    },
    {
      id: "updated_at_source",
      accessorKey: "updated_at_source",
      header: "Updated At Source",
      enableSorting: false,
      cell: dateCellRenderer,
      meta: { defaultVisible: false },
    },
    {
      id: "expired_at",
      accessorKey: "expired_at",
      header: "Expired",
      enableSorting: false,
      cell: dateCellRenderer,
      meta: { defaultVisible: false },
    },
    {
      id: "seen",
      accessorKey: "seen",
      header: "Seen",
      enableSorting: false,
      meta: { defaultVisible: false },
    },
  ];
}
