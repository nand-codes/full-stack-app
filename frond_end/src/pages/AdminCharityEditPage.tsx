import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAdminCharity, updateAdminCharity, createAdminCharity, deleteAdminCharity } from '../api/auth';
import './AdminDashboard.css';

export default function AdminCharityEditPage() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const isNew = !slug || slug === 'new';
  
  const [formData, setFormData] = useState({ name: '', short_description: '', is_active: true, website_url: '' });
  const [loading, setLoading] = useState(!isNew);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isNew) return;
    getAdminCharity(slug).then(({ data }) => {
      setFormData({ 
        name: data.name, 
        short_description: data.short_description, 
        is_active: data.is_active || false, 
        website_url: data.website_url || '' 
      });
      setLoading(false);
    }).catch(() => {
      alert('Failed to load charity');
      navigate('/admin');
    });
  }, [slug, navigate, isNew]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isNew) {
        await createAdminCharity(formData);
      } else {
        await updateAdminCharity(slug, formData);
      }
      alert('Charity saved successfully');
      navigate('/admin');
    } catch {
      alert('Save failed. Ensure name/slug is unique.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isNew || !window.confirm('Delete this charity permanently?')) return;
    try {
      await deleteAdminCharity(slug);
      navigate('/admin');
    } catch {
      alert('Delete failed');
    }
  };

  if (loading) return <div className="admin-section">Loading...</div>;

  return (
    <div className="admin-layout">
      <main className="admin-main">
        <button onClick={() => navigate('/admin')} className="btn-primary" style={{ marginBottom: '1rem', background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8' }}>← Back to Admin</button>
        <div className="admin-section" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2>{isNew ? 'Create Charity' : 'Edit Charity'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="field">
              <label>Charity Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} required />
            </div>
            <div className="field">
              <label>Short Description</label>
              <textarea value={formData.short_description} onChange={e => setFormData({ ...formData, short_description: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', minHeight: '100px' }} required />
            </div>
            <div className="field">
              <label>Website URL</label>
              <input type="url" value={formData.website_url} onChange={e => setFormData({ ...formData, website_url: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} />
            </div>
            <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
              <label htmlFor="isActive" style={{ margin: 0 }}>Active & Published</label>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1 }}>
                {submitting ? 'Saving...' : 'Save Charity'}
              </button>
              {!isNew && (
                <button type="button" onClick={handleDelete} className="btn-primary" style={{ background: '#ef4444', color: '#fff' }}>
                  Delete
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
