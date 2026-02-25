export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  foundAt: string;
  postedDate?: string;
}

export interface PaginationConfig {
  /** click: navigate to next page; show-more: loads more into same page without navigation; url: URL template */
  type: 'click' | 'show-more' | 'url';
  nextPageSelector?: string;
  urlTemplate?: string; // use {page} placeholder
  maxPages?: number;
  delayMs?: number;
}

export interface BoardConfig {
  name: string;
  url: string;
  company?: string;
  selectors: {
    jobCard: string;
    title: string;
    location: string;
    link: string;
    company?: string | null;
    postedDate?: string | null;
    nextPage?: string | null;
  };
  pagination?: PaginationConfig;
  waitForSelector?: string;
}

export interface ScrapeResult {
  board: string;
  jobs: Job[];
}
