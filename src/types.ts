export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  foundAt: string;
}

export interface PaginationConfig {
  /** click: navigate to next page; show-more: loads more into same page without navigation; url: URL template */
  type: 'click' | 'show-more' | 'url';
  nextPageSelector?: string;
  urlTemplate?: string; // use {page} placeholder
  maxPages?: number;
  delayMs?: number;
}

export interface SourceConfig {
  name: string;
  url: string;
  analyzeUrl?: string;
  company?: string;
  location?: string;
  selectors: {
    jobCard: string;
    title: string;
    link: string;
    nextPage?: string | null;
  };
  pagination?: PaginationConfig;
}

export interface ScrapeResult {
  source: string;
  jobs: Job[];
}
