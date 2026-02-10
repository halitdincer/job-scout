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

export type ApiBoard = {
  id: string;
  name: string;
  url: string;
  selectors: Record<string, string | null>;
  pagination?: Record<string, unknown>;
  waitForSelector?: string;
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

export type Run = {
  id: string;
  boardId: string;
  userId: string;
  startedAt: string;
  finishedAt: string | null;
  jobsFound: number;
  jobsNew: number;
  status: 'running' | 'success' | 'error';
  errorMsg: string | null;
};

export type AnalyzeResult = {
  url: string;
  name: string;
  selectors: Record<string, string | null>;
  waitForSelector?: string;
};
