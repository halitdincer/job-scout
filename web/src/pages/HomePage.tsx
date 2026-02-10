import { useBoardsData, useJobsData } from '../hooks';
import { useAuth } from '../context/AuthContext';

function formatDate(value?: string) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return date.toLocaleString();
}

export default function HomePage() {
  const jobs = useJobsData({ limit: 1 });
  const boards = useBoardsData();
  const { user } = useAuth();

  if (jobs.error || boards.error) {
    return <div className="card">Failed to load data.</div>;
  }

  const jobCount = jobs.data?.total ?? 0;
  const boardCount = (boards.data ?? []).length;
  const latestJob = jobs.data?.jobs[0];

  return (
    <div className="stack">
      <section className="card hero">
        <h2>Welcome, {user?.email}</h2>
        <p>
          {jobCount} job{jobCount !== 1 ? 's' : ''} across {boardCount} board{boardCount !== 1 ? 's' : ''}.
        </p>
        <p className="muted">
          Last activity: {formatDate(latestJob?.lastSeenAt)}
        </p>
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
          <h3>Latest job</h3>
          <p className="muted">
            {latestJob?.title ?? 'No jobs yet'}
          </p>
        </div>
      </section>
    </div>
  );
}
