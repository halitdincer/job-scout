export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  firstSeenAt: string;
  lastSeenAt: string;
  source: string;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
  sourceCount?: number;
};

export type ApiSource = {
  id: string;
  name: string;
  url: string;
  analyzeUrl?: string;
  state?: 'active' | 'inactive' | 'deleted';
  deletedAt?: string | null;
  company?: string;
  location?: string;
  companyName?: string;
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
  sourcesTotal: number;
  sourcesDone: number;
  jobsFound: number;
  jobsNew: number;
};

export type ScrapeRunSource = {
  id: string;
  runId: string;
  sourceId: string;
  sourceName: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'pending' | 'running' | 'success' | 'error';
  jobsFound: number;
  jobsNew: number;
  errorMsg: string | null;
};

export type ScrapeRunDetail = ScrapeRun & { sources: ScrapeRunSource[] };

export type AnalyzeResult = {
  url: string;
  name: string;
  selectors: Record<string, string | null>;
  pagination?: Record<string, unknown>;
  validation: {
    score: number;
    status: 'pass' | 'warn' | 'fail';
    jobsFound: number;
    uniqueUrlRatio: number;
    titleNonEmptyRatio: number;
    reasons: string[];
  };
};

export type PreviewJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
};

export type PreviewResult = {
  jobs: PreviewJob[];
  total: number;
};
