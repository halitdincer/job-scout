/** API contracts mirrored from core/models.py + core/views.py serializers.
 *
 * Keep field names in sync with `.values(...)` calls in the Django views;
 * the server is authoritative.
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
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "bamboohr"
  | "phenom"
  | "jibe";

export type Source = {
  id: number;
  name: string;
  platform: SourcePlatform;
  board_id: string;
  is_active: boolean;
};

export type JobStatus = "active" | "expired";
export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "intern"
  | "temporary"
  | "unknown";
export type WorkplaceType = "on_site" | "remote" | "hybrid" | "unknown";

export type JobListing = {
  id: number;
  source_id: number;
  source__name: string;
  title: string;
  department: string | null;
  url: string;
  status: JobStatus;
  team: string | null;
  employment_type: EmploymentType | null;
  workplace_type: WorkplaceType | null;
  expired_at: string | null;
  published_at: string | null;
  updated_at_source: string | null;
  first_seen_at: string;
  last_seen_at: string;
  seen: boolean;
};

export type FilterExpression =
  | {
      op: "and" | "or";
      children: FilterExpression[];
    }
  | {
      field: string;
      op: string;
      value: unknown;
    };

export type SavedView = {
  id: number;
  name: string;
  filters: FilterExpression | null;
  columns: string[] | null;
  sort: Array<{ field: string; dir: "asc" | "desc" }> | null;
  page_size: number | null;
  created_at: string;
  updated_at: string;
};
