import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompaniesData } from '../hooks';
import { Company } from '../types';

export default function CompaniesPage() {
  const { data, error, loading } = useCompaniesData();
  const [deleteError, setDeleteError] = useState('');
  const navigate = useNavigate();

  async function handleDelete(company: Company) {
    if (!confirm(`Delete company "${company.name}"? Boards linked to this company will be unlinked.`)) return;
    setDeleteError('');
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteError(body.error ?? 'Failed to delete company');
        return;
      }
      // Reload
      window.location.reload();
    } catch (err: any) {
      setDeleteError(err.message ?? 'Network error');
    }
  }

  if (loading) return <div className="stack"><p className="muted">Loading…</p></div>;
  if (error) return <div className="card">Failed to load companies.</div>;

  return (
    <div className="stack">
      <div className="row-between">
        <h2>Companies</h2>
      </div>

      {deleteError && <p className="error">{deleteError}</p>}

      {(data ?? []).length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p className="muted">No companies yet. Add a company when creating or editing a board.</p>
        </div>
      )}

      {(data ?? []).length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th style={{ textAlign: 'right' }}>Boards</th>
                <th style={{ textAlign: 'right' }}>Jobs</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((company) => (
                <tr
                  key={company.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/jobs?companies=${company.id}`)}
                >
                  <td>{company.name}</td>
                  <td style={{ textAlign: 'right' }}>{company.boardCount ?? 0}</td>
                  <td style={{ textAlign: 'right' }}>{company.jobCount ?? 0}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="button button-small button-danger"
                      onClick={(e) => { e.stopPropagation(); handleDelete(company); }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
