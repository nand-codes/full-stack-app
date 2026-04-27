import { useEffect, useState } from 'react';
import { getMySubscription, type SubscriptionInfo } from '../api/auth';
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

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { window.location.href = '/login'; return; }
    setUser(JSON.parse(stored));

    // Fetch subscription status
    getMySubscription()
      .then(({ data }) => setSub(data))
      .catch(() => setSub(null))
      .finally(() => setSubLoading(false));
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
      ? `${sub.days_left} day${sub.days_left !== 1 ? 's' : ''} remaining`
      : 'No active subscription';

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
            <p>View and track your golf scores</p>
          </div>

          {/* Subscription — replaces Statistics */}
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
