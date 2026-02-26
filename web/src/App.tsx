import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import SourcesPage from './pages/SourcesPage';
import SourceDetailPage from './pages/SourceDetailPage';
import JobsPage from './pages/JobsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RunsPage from './pages/RunsPage';
import RunDetailPage from './pages/RunDetailPage';

function NavBar() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          <span className="logo-mark">JS</span>
          JobScout
        </Link>
        <nav className="nav">
          {user && (
            <>
              <NavLink to="/" end>Home</NavLink>
              <NavLink to="/jobs">Jobs</NavLink>
              <NavLink to="/sources">Sources</NavLink>
              <NavLink to="/runs">Runs</NavLink>
              <button className="button button-secondary button-small" onClick={logout}>
                Sign out
              </button>
            </>
          )}
          {!user && (
            <>
              <NavLink to="/login">Sign in</NavLink>
              <NavLink to="/register">Register</NavLink>
            </>
          )}
        </nav>
      </div>
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
              path="/sources"
              element={
                <ProtectedRoute>
                  <SourcesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sources/:id"
              element={
                <ProtectedRoute>
                  <SourceDetailPage />
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
            <Route
              path="/runs/:id"
              element={
                <ProtectedRoute>
                  <RunDetailPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
