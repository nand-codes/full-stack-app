import { useEffect, useState } from 'react';
import {
  listCharities, getMyCharity, selectMyCharity,
  getMySubscription,
  type Charity, type UserCharitySelection, type SubscriptionInfo,
} from '../api/auth';
import './CharitiesPage.css';

export default function CharitiesPage() {
  const [charities, setCharities]   = useState<Charity[]>([]);
  const [mySelection, setMySelection] = useState<UserCharitySelection | null>(null);
  const [sub, setSub]               = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox]     = useState<string | null>(null);
  const [message, setMessage]       = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  })();

  useEffect(() => {
    if (!localStorage.getItem('access_token')) { window.location.href = '/login'; return; }

    Promise.all([
      listCharities(),
      getMyCharity().catch(() => null),
      getMySubscription().catch(() => null),
    ]).then(([c, mc, s]) => {
      setCharities(c.data);
      if (mc) setMySelection(mc.data);
      if (s)  setSub(s.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleSelect = async (charity: Charity) => {
    setSaving(charity.id);
    setMessage(null);
    try {
      const { data } = await selectMyCharity({ charity_id: charity.id, contribution_percentage: 10 });
      setMySelection(data);
      setMessage({ text: `✅ You are now supporting "${charity.name}"!`, type: 'success' });
    } catch {
      setMessage({ text: 'Failed to select charity. Please try again.', type: 'error' });
    } finally {
      setSaving(null);
    }
  };

  const toggleEvents = (id: string) =>
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));

  /* ── Receipt download ─────────────────────────────────────────────────── */
  const downloadReceipt = () => {
    if (!mySelection?.charity || !sub) return;

    const amount  = sub.plan === 'yearly' ? 20000 : 2500;
    const contrib = (amount * (mySelection.contribution_percentage / 100)).toFixed(2);
    const date    = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Charity Contribution Receipt</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; color: #1e293b; }
    .logo  { font-size: 2rem; color: #7c3aed; font-weight: 900; }
    h2     { color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 0.5rem; }
    .row   { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0; }
    .label { color: #64748b; font-size: 0.9rem; }
    .value { font-weight: 600; }
    .total { font-size: 1.1rem; color: #10b981; font-weight: 700; }
    .footer{ margin-top: 2rem; font-size: 0.78rem; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="logo">⬡ FullStack App</div>
  <h2>Charity Contribution Receipt</h2>
  <div class="row"><span class="label">Recipient Name</span>  <span class="value">${user.username || '—'}</span></div>
  <div class="row"><span class="label">Email</span>            <span class="value">${user.email || '—'}</span></div>
  <div class="row"><span class="label">Subscription Plan</span><span class="value">${sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)}</span></div>
  <div class="row"><span class="label">Subscription Amount</span><span class="value">₹${amount.toLocaleString('en-IN')}</span></div>
  <div class="row"><span class="label">Charity</span>          <span class="value">${mySelection.charity.name}</span></div>
  <div class="row"><span class="label">Contribution %</span>   <span class="value">${mySelection.contribution_percentage}%</span></div>
  <div class="row"><span class="label">Contribution Amount</span><span class="value total">₹${Number(contrib).toLocaleString('en-IN')}</span></div>
  <div class="row"><span class="label">Date</span>             <span class="value">${date}</span></div>
  <div class="footer">
    This is an auto-generated receipt. For queries, contact support.<br/>
    Thank you for your generosity 💚
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `charity-receipt-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="charities-wrapper">
      <div className="charities-loading">
        <div className="spinner-lg" />
        <p>Loading charities…</p>
      </div>
    </div>
  );

  const selectedId = mySelection?.charity?.id;

  return (
    <div className="charities-wrapper">
      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Event photo" />
        </div>
      )}

      {/* Navbar */}
      <nav className="dash-nav">
        <div className="nav-brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">FullStack App</span>
        </div>
        <a href="/dashboard" className="nav-back">← Dashboard</a>
      </nav>

      <main className="charities-main">
        {/* Header */}
        <div className="charities-header">
          <h1>Support a Charity 💚</h1>
          <p>A portion of your subscription goes directly to your chosen charity</p>
        </div>

        {/* Alert */}
        {message && (
          <div className={`sub-alert ${message.type === 'success' ? 'sub-alert--success' : 'sub-alert--error'}`}
               style={{ marginBottom: '1.5rem', borderRadius: '12px', padding: '1rem 1.4rem',
                        background: message.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                        color: message.type === 'success' ? '#6ee7b7' : '#fca5a5' }}>
            {message.text}
          </div>
        )}

        {/* My charity banner */}
        {mySelection?.charity && (
          <div className="my-charity-banner">
            <span className="banner-icon">💚</span>
            <div>
              <strong>Your Charity: {mySelection.charity.name}</strong>
              <span>{mySelection.contribution_percentage}% of your subscription · {
                sub
                  ? `₹${((( sub.plan === 'yearly' ? 20000 : 2500) * mySelection.contribution_percentage) / 100).toLocaleString('en-IN')} per ${sub.plan === 'yearly' ? 'year' : 'month'}`
                  : 'Subscribe to activate'
              }</span>
            </div>
            {sub && (
              <button className="download-receipt-btn" onClick={downloadReceipt} id="download-receipt-btn">
                ⬇ Download Receipt
              </button>
            )}
          </div>
        )}

        {/* Charities grid */}
        {charities.length === 0 ? (
          <div className="charities-empty">
            <p>🔎 No charities available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="charities-grid">
            {charities.map((c) => {
              const isSelected = c.id === selectedId;
              const isSaving   = saving === c.id;
              const evOpen     = expandedEvents[c.id];
              const pubEvents  = c.events.filter((e) => e.is_published);

              return (
                <div
                  key={c.id}
                  className={`charity-card ${c.is_featured ? 'featured' : ''} ${isSelected ? 'selected-card' : ''}`}
                >
                  {/* Image */}
                  {c.image
                    ? <img src={c.image} alt={c.name} className="charity-img" />
                    : <div className="charity-img-placeholder">💚</div>
                  }

                  <div className="charity-body">
                    {/* Badges */}
                    <div className="charity-badges">
                      {c.is_featured && <span className="badge badge-featured">⭐ Featured</span>}
                      {isSelected    && <span className="badge badge-selected">✓ Your Choice</span>}
                    </div>

                    <h2 className="charity-name">{c.name}</h2>
                    <p className="charity-short">{c.short_description || c.description.slice(0, 120) + '…'}</p>

                    {/* Select button */}
                    <button
                      id={`select-charity-${c.slug}`}
                      className={`charity-select-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(c)}
                      disabled={isSaving}
                    >
                      {isSaving ? '…Saving' : isSelected ? '✓ Currently Supporting' : 'Support This Charity'}
                    </button>

                    {/* Events toggle */}
                    {pubEvents.length > 0 && (
                      <>
                        <button
                          className="toggle-events-btn"
                          onClick={() => toggleEvents(c.id)}
                        >
                          {evOpen ? '▲ Hide' : '▼ Show'} Events ({pubEvents.length})
                        </button>

                        {evOpen && (
                          <div className="events-section">
                            {pubEvents.map((ev) => (
                              <div key={ev.id} className="event-item">
                                <div className="event-header">
                                  <span className="event-date-badge">
                                    {new Date(ev.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                  <div>
                                    <p className="event-title">{ev.title}</p>
                                    {ev.location && <p className="event-location">📍 {ev.location}</p>}
                                  </div>
                                </div>
                                {ev.description && <p className="event-desc">{ev.description}</p>}
                                {ev.photos.length > 0 && (
                                  <div className="event-photos">
                                    {ev.photos.map((ph) => (
                                      <img
                                        key={ph.id}
                                        src={ph.image}
                                        alt={ph.caption || 'Event photo'}
                                        className="event-photo"
                                        title={ph.caption}
                                        onClick={() => setLightbox(ph.image)}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
