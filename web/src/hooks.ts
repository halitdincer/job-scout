import { useEffect, useState } from 'react';
import { BoardsData, SiteData } from './types';

export function useJobsData() {
  const [data, setData] = useState<SiteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('./data/jobs.json')
      .then((res) => res.json())
      .then((payload) => setData(payload))
      .catch((err) => setError(err.message));
  }, []);

  return { data, error };
}

export function useBoardsData() {
  const [data, setData] = useState<BoardsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('./data/boards.json')
      .then((res) => res.json())
      .then((payload) => setData(payload))
      .catch((err) => setError(err.message));
  }, []);

  return { data, error };
}
