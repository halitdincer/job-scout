import { useBoardsData, useJobsData } from '../hooks';

export default function BoardsPage() {
  const boards = useBoardsData();
  const jobs = useJobsData();

  if (boards.error || jobs.error) {
    return <div className="card">Failed to load board data.</div>;
  }

  const boardJobs = new Map<string, number>();
  jobs.data?.jobs.forEach((job) => {
    boardJobs.set(job.board, (boardJobs.get(job.board) ?? 0) + 1);
  });

  return (
    <div className="stack">
      <h2>Boards</h2>
      <div className="grid">
        {boards.data?.boards.map((board) => (
          <div key={board.name} className="card">
            <h3>{board.name}</h3>
            <p className="muted">{board.url}</p>
            <p className="stat">{boardJobs.get(board.name) ?? 0} jobs</p>
          </div>
        ))}
      </div>
    </div>
  );
}
