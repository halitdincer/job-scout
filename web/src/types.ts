export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  firstSeenAt: string;
  lastSeenAt: string;
  postedDate?: string;
  board: string;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
  boardCount?: number;
};

export type Company = {
  id: string;
  name: string;
  boardCount?: number;
  jobCount?: number;
};

export type GeoResult = {
  key: string;
  label: string;
  type: 'country' | 'state' | 'city';
};

export type ApiBoard = {
  id: string;
  name: string;
  url: string;
  state?: 'active' | 'inactive' | 'deleted';
  deletedAt?: string | null;
  company?: string;
  location?: string;
  companyId?: string;
  companyName?: string;
  locationKey?: string;
  locationLabel?: string;
  tags: Tag[];
  selectors: Record<string, string | null>;
  pagination?: Record<string, unknown>;
  lastRun?: { status: string; finishedAt: string | null } | null;
};

export type JobsResponse = {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type User = {
  id: string;
  email: string;
};

export type ScrapeRun = {
  id: string;
  userId: string;
  triggeredBy: 'cron' | 'manual';
  startedAt: string;
  finishedAt: string | null;
  status: 'running' | 'success' | 'partial' | 'error';
  boardsTotal: number;
  boardsDone: number;
  jobsFound: number;
  jobsNew: number;
};

export type ScrapeRunBoard = {
  id: string;
  runId: string;
  boardId: string;
  boardName: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'pending' | 'running' | 'success' | 'error';
  jobsFound: number;
  jobsNew: number;
  errorMsg: string | null;
};

export type ScrapeRunDetail = ScrapeRun & { boards: ScrapeRunBoard[] };

export type AnalyzeResult = {
  url: string;
  name: string;
  selectors: Record<string, string | null>;
  pagination?: Record<string, unknown>;
  jobsFound?: number;
};

export type PreviewJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  postedDate?: string;
};

export type PreviewResult = {
  jobs: PreviewJob[];
  total: number;
};
