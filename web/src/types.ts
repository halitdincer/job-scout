export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  foundAt: string;
  postedDate?: string;
  board: string;
};

export type BoardConfig = {
  name: string;
  url: string;
  selectors: Record<string, string | null>;
  pagination?: Record<string, unknown>;
  waitForSelector?: string;
};

export type SiteData = {
  generatedAt: string;
  jobs: Job[];
};

export type BoardsData = {
  generatedAt: string;
  boards: BoardConfig[];
};
