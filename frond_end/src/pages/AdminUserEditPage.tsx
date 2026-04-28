import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAdminUser, updateAdminUser } from '../api/auth';
import './AdminDashboard.css';

export default function AdminUserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({ username: '', email: '', role: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getAdminUser(id).then(({ data }) => {
      setFormData({ username: data.username, email: data.email, role: data.role });
      setLoading(false);
    }).catch(() => {
      alert('Failed to load user');
      navigate('/admin');
    });
  }, [id, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      await updateAdminUser(id, formData);
      alert('User updated successfully');
      navigate('/admin');
    } catch {
      alert('Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="admin-section">Loading...</div>;

  return (
    <div className="admin-layout">
      <main className="admin-main">
        <button onClick={() => navigate('/admin')} className="btn-primary" style={{ marginBottom: '1rem', background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8' }}>← Back to Admin</button>
        <div className="admin-section" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2>Edit User {id}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="field">
              <label>Username</label>
              <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} />
            </div>
            <div className="field">
              <label>Role</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
