import { NavLink, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import BoardsPage from './pages/BoardsPage';
import JobsPage from './pages/JobsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RunsPage from './pages/RunsPage';

function NavBar() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div>
        <h1>JobScout</h1>
        <p className="subtitle">Your personal job feed</p>
      </div>
      <nav className="nav">
        {user && (
          <>
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/boards">Boards</NavLink>
            <NavLink to="/jobs">Jobs</NavLink>
            <NavLink to="/runs">Runs</NavLink>
            <button className="button button-small" onClick={logout}>Sign out</button>
          </>
        )}
        {!user && (
          <>
            <NavLink to="/login">Sign in</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app">
        <NavBar />
        <main className="content">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/boards"
              element={
                <ProtectedRoute>
                  <BoardsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <JobsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/runs"
              element={
                <ProtectedRoute>
                  <RunsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
