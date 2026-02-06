import { NavLink, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BoardsPage from './pages/BoardsPage';
import JobsPage from './pages/JobsPage';

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>JobScout</h1>
          <p className="subtitle">Static job tracker powered by scheduled scrapes</p>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/boards">Boards</NavLink>
          <NavLink to="/jobs">Jobs</NavLink>
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/boards" element={<BoardsPage />} />
          <Route path="/jobs" element={<JobsPage />} />
        </Routes>
      </main>
    </div>
  );
}
