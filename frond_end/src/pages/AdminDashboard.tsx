import { useEffect, useState } from 'react';
import { 
  getAdminAnalytics, getAdminAllWinners, updateWinnerStatus, 
  getAdminUsers, getAdminDraws, listCharities,
  type AdminAnalytics, type DrawResult, type MonthlyDraw, type Charity 
} from '../api/auth';
import './AdminDashboard.css';

type Tab = 'analytics' | 'users' | 'draws' | 'charities' | 'winners';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [draws, setDraws] = useState<MonthlyDraw[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [winners, setWinners] = useState<DrawResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      window.location.href = '/dashboard';
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [an, us, dr, ch, wi] = await Promise.allSettled([
        getAdminAnalytics(),
        getAdminUsers(),
        getAdminDraws(),
        listCharities(),
        getAdminAllWinners()
      ]);
      if (an.status === 'fulfilled') setAnalytics(an.value.data);
      if (us.status === 'fulfilled') setUsers(us.value.data);
      if (dr.status === 'fulfilled') setDraws(dr.value.data);
      if (ch.status === 'fulfilled') setCharities(ch.value.data);
      if (wi.status === 'fulfilled') setWinners(wi.value.data);
    } finally {
      setLoading(false);
    }
  };

  const handleWinnerUpdate = async (id: string, field: string, value: string) => {
    try {
      await updateWinnerStatus(id, { [field]: value });
      // update local state
      setWinners(winners.map(w => w.id === id ? { ...w, [field]: value } : w));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) return <div className="admin-loading">Loading Admin Dashboard...</div>;

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">⚙️ Admin Panel</div>
        <nav className="admin-nav">
          <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>📊 Analytics</button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>👥 Users</button>
          <button className={activeTab === 'draws' ? 'active' : ''} onClick={() => setActiveTab('draws')}>🎰 Draws</button>
          <button className={activeTab === 'charities' ? 'active' : ''} onClick={() => setActiveTab('charities')}>💚 Charities</button>
          <button className={activeTab === 'winners' ? 'active' : ''} onClick={() => setActiveTab('winners')}>🏆 Winners</button>
        </nav>
        <a href="/dashboard" className="back-link">← Back to App</a>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {activeTab === 'analytics' && (
          <div className="admin-section">
            <h2>Reports & Analytics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Users</h3>
                <p>{analytics?.total_users || 0}</p>
              </div>
              <div className="stat-card">
                <h3>Total Prize Pool</h3>
                <p>₹{Number(analytics?.total_prize_pool || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="stat-card">
                <h3>Total Draws</h3>
                <p>{analytics?.total_draws || 0} ({analytics?.published_draws || 0} published)</p>
              </div>
              <div className="stat-card">
                <h3>Charity Supporters</h3>
                <p>{analytics?.charity_supporters || 0} users contributing</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>User Management</h2>
            </div>
            <table className="admin-table">
              <thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Action</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td><td>{u.username}</td><td>{u.email}</td>
                    <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    <td><a href={`/admin/users/${u.id}`} className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Edit</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'draws' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Draw Management</h2>
              <a href="/admin/draws/create" className="btn-primary">Create New Draw</a>
            </div>
            <table className="admin-table">
              <thead><tr><th>Month/Year</th><th>Mode</th><th>Status</th><th>Jackpot</th><th>Action</th></tr></thead>
              <tbody>
                {draws.map(d => (
                  <tr key={d.id}>
                    <td>{d.month}/{d.year}</td>
                    <td>{d.draw_mode}</td>
                    <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                    <td>₹{Number(d.effective_jackpot || 0).toLocaleString('en-IN')}</td>
                    <td><a href={`/admin/draws/${d.id}`} className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Manage</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'charities' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Charity Management</h2>
              <a href="/admin/charities/create" className="btn-primary">Add New Charity</a>
            </div>
            <div className="charity-grid">
              {charities.map(c => (
                <div key={c.id} className="admin-charity-card">
                  <h3>{c.name}</h3>
                  <p>{c.short_description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge badge-${c.is_active ? 'published' : 'pending'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <a href={`/admin/charities/${c.slug}`} className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Edit</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'winners' && (
          <div className="admin-section">
            <h2>Winners Verification & Payouts</h2>
            <table className="admin-table">
              <thead><tr><th>User</th><th>Match</th><th>Prize</th><th>Verification</th><th>Payout</th></tr></thead>
              <tbody>
                {winners.map(w => (
                  <tr key={w.id}>
                    <td>{w.username}</td>
                    <td>{w.match_count} (Tier: {w.prize_tier.replace('_', ' ')})</td>
                    <td>₹{Number(w.prize_amount).toLocaleString('en-IN')}</td>
                    <td>
                      <select 
                        value={w.verification_status} 
                        onChange={(e) => handleWinnerUpdate(w.id, 'verification_status', e.target.value)}
                        className={`status-select bg-${w.verification_status}`}
                      >
                        <option value="none">Not Required</option>
                        <option value="pending">Pending Upload</option>
                        <option value="submitted">Proof Submitted</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      {w.proof_image && <a href={`http://localhost:8000${w.proof_image}`} target="_blank" rel="noreferrer" className="proof-link">View Proof</a>}
                    </td>
                    <td>
                      <select 
                        value={w.payment_status} 
                        onChange={(e) => handleWinnerUpdate(w.id, 'payment_status', e.target.value)}
                        className={`status-select bg-${w.payment_status}`}
                        disabled={w.verification_status !== 'approved' && w.prize_tier !== 'none'}
                      >
                        <option value="none">No Payment</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
