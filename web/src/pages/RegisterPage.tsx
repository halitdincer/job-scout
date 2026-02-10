import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(email, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h2>Create account</h2>
        <form onSubmit={handleSubmit} className="stack">
          {error && <p className="error">{error}</p>}
          <label className="form-label">
            Email
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="form-label">
            Password
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label className="form-label">
            Confirm password
            <input
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="muted">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
