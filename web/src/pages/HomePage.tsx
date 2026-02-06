import { useBoardsData, useJobsData } from '../hooks';

function formatDate(value?: string) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return date.toLocaleString();
}

export default function HomePage() {
  const jobs = useJobsData();
  const boards = useBoardsData();

  if (jobs.error || boards.error) {
    return <div className="card">Failed to load data.</div>;
  }

  const jobCount = jobs.data?.jobs.length ?? 0;
  const boardCount = boards.data?.boards.length ?? 0;

  return (
    <div className="stack">
      <section className="card hero">
        <h2>Latest scrape</h2>
        <p>
          {jobCount} jobs across {boardCount} boards.
        </p>
        <p className="muted">Last generated: {formatDate(jobs.data?.generatedAt)}</p>
      </section>

      <section className="grid">
        <div className="card">
          <h3>Boards tracked</h3>
          <p className="stat">{boardCount}</p>
        </div>
        <div className="card">
          <h3>Total jobs</h3>
          <p className="stat">{jobCount}</p>
        </div>
        <div className="card">
          <h3>Newest job</h3>
          <p className="muted">
            {jobs.data?.jobs[0]?.title ? jobs.data.jobs[0].title : 'No jobs yet'}
          </p>
        </div>
      </section>
    </div>
  );
}
