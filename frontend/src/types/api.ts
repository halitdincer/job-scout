/** UI-facing API contracts.
 *
 * The Spring backend returns generated camelCase DTOs. The frontend API modules
 * map those responses into these snake_case view models to keep the UI stable.
 */

export type RunStatus = "pending" | "running" | "completed" | "failed";

export type Run = {
  id: number;
  status: RunStatus;
  started_at: string | null;
  finished_at: string | null;
  sources_processed: number;
  listings_created: number;
  listings_updated: number;
  listings_expired: number;
  error_message: string | null;
  created_at: string;
};

export type SourcePlatform =
  | "GREENHOUSE"
  | "LEVER"
  | "ASHBY"
  | "WORKDAY"
  | "BAMBOOHR"
  | "PHENOM"
  | "JIBE";

export type Source = {
  id: number;
  name: string;
  platform: SourcePlatform;
  board_id: string;
  is_active: boolean;
};

export type JobStatus = "ACTIVE" | "EXPIRED";

export type JobListing = {
  id: number;
  source_id: number;
  source_name: string;
  external_id: string;
  title: string;
  locations: LocationTag[];
  url: string;
  status: JobStatus;
  country: string[];
  region: string[];
  city: string[];
  expired_at: string | null;
  published_at: string | null;
  updated_at_source: string | null;
  first_seen_at: string;
  last_seen_at: string;
  seen: boolean;
};

export type LocationTag = {
  id: number;
  name: string;
  country_code: string;
  region_code: string;
  city: string;
  geo_key: string;
};

export type { FilterExpression } from "@/jobs/filterExpression";
import type { FilterExpression } from "@/jobs/filterExpression";

export type SavedViewColumn = {
  field: string;
  visible?: boolean;
};

export type SavedViewSort = {
  field: string;
  dir: "asc" | "desc";
};

export type SavedViewConfig = {
  page_size?: number;
};

export type SavedView = {
  id: number;
  name: string;
  filter_expression: FilterExpression | null;
  columns: SavedViewColumn[];
  sort: SavedViewSort[];
  config: SavedViewConfig;
  created_at: string;
  updated_at: string;
};

export type SavedViewPayload = {
  name: string;
  filter_expression: FilterExpression | null;
  columns: SavedViewColumn[];
  sort: SavedViewSort[];
  config: SavedViewConfig;
};
