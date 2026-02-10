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
