import { useEffect, useState } from 'react';
import { 
  getMySubscription, type SubscriptionInfo,
  getMyCharity, type UserCharitySelection,
  getMyDrawResults, getLatestDraw, type MyDrawResult, type MonthlyDraw
} from '../api/auth';
import './Dashboard.css';

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
}

export default function Dashboard() {
  const [user, setUser]           = useState<User | null>(null);
  const [sub, setSub]             = useState<SubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  
  const [charitySelection, setCharitySelection] = useState<UserCharitySelection | null>(null);
  const [drawHistory, setDrawHistory] = useState<MyDrawResult[]>([]);
  const [latestDraw, setLatestDraw] = useState<MonthlyDraw | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { window.location.href = '/login'; return; }
    setUser(JSON.parse(stored));

    // Fetch dashboard data
    Promise.allSettled([
      getMySubscription(),
      getMyCharity(),
      getMyDrawResults(),
      getLatestDraw()
    ]).then(([subRes, charityRes, historyRes, latestRes]) => {
      if (subRes.status === 'fulfilled') setSub(subRes.value.data);
      if (charityRes.status === 'fulfilled') setCharitySelection(charityRes.value.data);
      if (historyRes.status === 'fulfilled') {
        setDrawHistory(Array.isArray(historyRes.value.data) ? historyRes.value.data : []);
      }
      if (latestRes.status === 'fulfilled') setLatestDraw(latestRes.value.data);
    }).finally(() => {
      setSubLoading(false);
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  if (!user) return null;

  const initials = user.username.slice(0, 2).toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Subscription card content
  const subIcon  = sub ? (sub.plan === 'yearly' ? '⭐' : '📅') : '🔓';
  const subTitle = sub ? `${sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)} Plan` : 'No Plan';
  const subDesc  = subLoading
    ? 'Loading…'
    : sub
      ? `${sub.is_active ? 'Active' : 'Inactive'} · Renews ${new Date(sub.end_date).toLocaleDateString('en-IN')}`
      : 'No active subscription';

  // Charity card content
  const charityName = charitySelection?.charity?.name || 'None selected';
  const charityPct = charitySelection?.contribution_percentage 
    ? `${charitySelection.contribution_percentage}% contribution` 
    : 'Support a cause today';

  // Draw summary
  const drawsEntered = drawHistory.length;
  const isEnteredLatest = !!latestDraw?.my_entry;
  const drawStatus = latestDraw?.status === 'pending' 
    ? (isEnteredLatest ? '✓ Entered upcoming draw' : '⚠️ Enter upcoming draw!')
    : 'Check latest results';

  return (
    <div className="dashboard-wrapper">
      {/* Navbar */}
      <nav className="dash-nav">
        <div className="nav-brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">FullStack App</span>
        </div>
        <div className="nav-right">
          <div className="nav-avatar">{initials}</div>
          <button className="btn-logout" onClick={handleLogout} id="logout-btn">
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="dash-main">
        <div className="welcome-card">
          <div className="welcome-avatar">{initials}</div>
          <p className="greeting-label">{greeting},</p>
          <h1 className="welcome-name">{user.username} 👋</h1>
          <p className="welcome-email">{user.email}</p>
          <span className={`role-badge role-${user.role}`}>{user.role}</span>
        </div>

        {/* Info cards */}
        <div className="info-grid">

          {/* My Scores */}
          <div className="info-card" onClick={() => window.location.href = '/scores'} style={{ cursor: 'pointer' }}>
            <span className="info-icon">🏌️</span>
            <h3>My Scores</h3>
            <p>View, enter, and edit your Stableford golf scores</p>
          </div>

          {/* Subscription */}
          <div
            className={`info-card sub-card ${sub ? 'sub-active' : 'sub-none'}`}
            onClick={() => window.location.href = '/subscription'}
            style={{ cursor: 'pointer' }}
          >
            <span className="info-icon">{subIcon}</span>
            <h3>Subscription</h3>
            <p className="sub-plan-name">{subTitle}</p>
            <p className={`sub-days ${!sub ? 'sub-days--empty' : ''}`}>{subDesc}</p>
            {sub && (
              <div className="sub-progress-bar">
                <div
                  className="sub-progress-fill"
                  style={{
                    width: `${Math.min(
                      (sub.days_left / (sub.plan === 'yearly' ? 365 : 30)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Charity */}
          <div className="info-card" onClick={() => window.location.href = '/charities'} style={{ cursor: 'pointer' }}>
            <span className="info-icon">💚</span>
            <h3>My Charity</h3>
            <p style={{ fontWeight: 500, color: '#f8fafc', margin: '0.2rem 0' }}>{charityName}</p>
            <p style={{ fontSize: '0.8rem', margin: 0 }}>{charityPct}</p>
          </div>

          {/* Monthly Draw */}
          <div className="info-card" onClick={() => window.location.href = '/draw'} style={{ cursor: 'pointer' }}>
            <span className="info-icon">🎰</span>
            <h3>Monthly Draw</h3>
            <p style={{ fontWeight: 500, color: '#f8fafc', margin: '0.2rem 0' }}>{drawsEntered} draws entered</p>
            <p style={{ fontSize: '0.8rem', margin: 0, color: isEnteredLatest ? '#10b981' : '#f59e0b' }}>
              {drawStatus}
            </p>
          </div>

          {/* Settings */}
          <div className="info-card">
            <span className="info-icon">⚙️</span>
            <h3>Settings</h3>
            <p>Manage your account preferences</p>
          </div>

        </div>
      </main>
    </div>
  );
}
