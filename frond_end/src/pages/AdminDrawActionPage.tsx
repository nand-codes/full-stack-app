import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAdminDrawDetail, simulateAdminDraw, publishAdminDraw, createAdminDraw } from '../api/auth';
import './AdminDashboard.css';

export default function AdminDrawActionPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  
  const [draw, setDraw] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, draw_mode: 'random' });

  useEffect(() => {
    if (isNew) return;
    getAdminDrawDetail(id).then(({ data }) => {
      setDraw(data);
      setLoading(false);
    }).catch(() => {
      alert('Failed to load draw');
      navigate('/admin');
    });
  }, [id, navigate, isNew]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAdminDraw(formData);
      alert('Draw created successfully');
      navigate('/admin');
    } catch {
      alert('Create failed. Ensure no duplicate month/year exists.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulate = async () => {
    if (!id || draw.status === 'published') return;
    setSubmitting(true);
    try {
      const { data } = await simulateAdminDraw(id);
      alert('Simulation completed');
      setDraw(data.draw);
    } catch (err: any) {
      alert('Simulation failed: ' + (err.response?.data?.error || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!id || draw.status === 'published' || !window.confirm('Are you sure? This cannot be undone.')) return;
    setSubmitting(true);
    try {
      const { data } = await publishAdminDraw(id);
      alert('Draw published successfully!');
      setDraw(data.draw);
    } catch (err: any) {
      alert('Publish failed: ' + (err.response?.data?.error || 'Unknown error'));
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
          
          {isNew ? (
            <>
              <h2>Create New Draw</h2>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="field">
                  <label>Year</label>
                  <input type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} required />
                </div>
                <div className="field">
                  <label>Month (1-12)</label>
                  <input type="number" min="1" max="12" value={formData.month} onChange={e => setFormData({ ...formData, month: parseInt(e.target.value) })} style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} required />
                </div>
                <div className="field">
                  <label>Draw Logic Mode</label>
                  <select value={formData.draw_mode} onChange={e => setFormData({ ...formData, draw_mode: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}>
                    <option value="random">Standard Random Style</option>
                    <option value="algorithmic">Algorithmic Weighted</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Draw'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>Manage Draw: {draw.month}/{draw.year}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
                <p><strong>Status:</strong> <span className={`badge badge-${draw.status}`}>{draw.status}</span></p>
                <p><strong>Mode:</strong> {draw.draw_mode}</p>
                <p><strong>Effective Jackpot:</strong> ₹{Number(draw.effective_jackpot).toLocaleString('en-IN')}</p>
                
                {draw.status !== 'published' && (
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button onClick={handleSimulate} className="btn-primary" disabled={submitting} style={{ flex: 1, background: '#6366f1', color: '#fff' }}>
                      {submitting ? 'Running...' : 'Run Simulation'}
                    </button>
                    <button onClick={handlePublish} className="btn-primary" disabled={submitting} style={{ flex: 1, background: '#10b981', color: '#fff' }}>
                      {submitting ? 'Publish...' : 'Publish Official Draw'}
                    </button>
                  </div>
                )}
                
                {draw.drawn_numbers && draw.drawn_numbers.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <h4>{draw.status === 'published' ? 'Official Numbers' : 'Simulated Numbers'}</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {draw.drawn_numbers.map((n: number) => (
                        <div key={n} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#38bdf8', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {n}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
