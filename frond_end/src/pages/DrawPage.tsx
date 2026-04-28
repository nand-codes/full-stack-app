import { useEffect, useState } from 'react';
import {
  getLatestDraw, getMyDrawResults, submitDrawEntry, uploadDrawProof,
  type MonthlyDraw, type MyDrawResult,
} from '../api/auth';
import './DrawPage.css';

const PRIZE_LABELS: Record<string, string> = {
  '5_match': '🏆 Jackpot!',
  '4_match': '🥈 4-Number Match',
  '3_match': '🥉 3-Number Match',
  'none':    '✗ No Match',
};

const VERIFICATION_LABELS: Record<string, string> = {
  'pending':   '⚠️ Action Required: Upload Score Proof',
  'submitted': '⏳ Verifying Proof...',
  'approved':  '✅ Proof Approved',
  'rejected':  '❌ Proof Rejected',
  'none':      '',
};

function Ball({ n, type }: { n: number; type: 'drawn' | 'matched' | 'user' | 'empty' }) {
  return <div className={`ball ball-${type}`}>{n || '?'}</div>;
}

type Tab = 'current' | 'history';

export default function DrawPage() {
  const [tab, setTab]             = useState<Tab>('current');
  const [draw, setDraw]           = useState<MonthlyDraw | null>(null);
  const [history, setHistory]     = useState<MyDrawResult[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage]     = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadFile, setUploadFile]   = useState<File | null>(null);

  const fetchData = async () => {
    try {
      const [d, h] = await Promise.all([
        getLatestDraw().catch(() => null),
        getMyDrawResults().catch(() => []),
      ]);
      if (d) {
        setDraw(d.data);
        if (d.data.my_entry) setSelected(d.data.my_entry);
      }
      setHistory(Array.isArray(h) ? h : (h as any)?.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('access_token')) { window.location.href = '/login'; return; }
    fetchData();
  }, []);

  const toggleNumber = (n: number) => {
    if (!draw || draw.status !== 'pending') return;
    setSelected((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (prev.length >= 5) return prev;
      return [...prev, n].sort((a, b) => a - b);
    });
  };

  const handleSubmit = async () => {
    if (!draw || selected.length !== 5) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await submitDrawEntry(draw.id, selected);
      setMessage({ text: '✅ Entry submitted! Good luck! 🍀', type: 'success' });
      await fetchData();
    } catch {
      setMessage({ text: 'Failed to submit entry. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadProof = async (resultId: string) => {
    if (!uploadFile) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await uploadDrawProof(resultId, uploadFile);
      setMessage({ text: '✅ Proof uploaded successfully. Our team will review it shortly.', type: 'success' });
      setUploadingId(null);
      setUploadFile(null);
      await fetchData();
    } catch {
      setMessage({ text: 'Failed to upload proof. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const resultClass = (tier: string) => {
    if (tier === '5_match') return 'result-jackpot';
    if (tier === '4_match') return 'result-4match';
    if (tier === '3_match') return 'result-3match';
    return 'result-none';
  };

  const prizeClass = (tier: string) => {
    if (tier === '5_match') return 'prize-jackpot';
    if (tier === '4_match') return 'prize-4';
    if (tier === '3_match') return 'prize-3';
    return 'prize-none';
  };

  if (loading) return (
    <div className="draw-wrapper">
      <div className="draw-loading">
        <div className="draw-spinner" />
        <p>Loading draw…</p>
      </div>
    </div>
  );

  return (
    <div className="draw-wrapper">
      {/* Nav */}
      <nav className="draw-nav">
        <div className="nav-brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">FullStack App</span>
        </div>
        <a href="/dashboard" className="nav-back">← Dashboard</a>
      </nav>

      <main className="draw-main">
        {/* Header */}
        <div className="draw-page-header">
          <h1>🎰 Monthly Draw</h1>
          <p>Pick 5 numbers (1-49) · Match to win · Jackpot rolls over each month</p>
        </div>

        {/* Tabs */}
        <div className="draw-tabs">
          <button className={`draw-tab ${tab === 'current' ? 'active' : ''}`} onClick={() => setTab('current')}>
            Current Draw
          </button>
          <button className={`draw-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            My Results ({history.length})
          </button>
        </div>

        {/* Alert */}
        {message && (
          <div className={`draw-alert draw-alert--${message.type}`}>{message.text}</div>
        )}

        {/* ── Tab: Current Draw ──────────────────────────────────────────── */}
        {tab === 'current' && (
          draw ? (
            <div className="current-draw-card">
              {/* Header */}
              <div className="draw-card-header">
                <div>
                  <div className="draw-card-title">
                    {draw.month_name} {draw.year} Draw
                    {draw.jackpot_rolled_over && (
                      <span style={{ marginLeft: '0.6rem', fontSize: '0.75rem', color: '#f87171',
                                     background: 'rgba(239,68,68,0.15)', padding: '0.2rem 0.6rem',
                                     borderRadius: '50px' }}>Rollover</span>
                    )}
                  </div>
                  <div className="draw-card-meta">
                    {draw.entry_count} entries · {draw.draw_mode === 'algorithmic' ? 'Score-weighted' : 'Random'} draw
                    {draw.winner_count > 0 && ` · ${draw.winner_count} winner${draw.winner_count > 1 ? 's' : ''}`}
                  </div>
                </div>
                <span className={`draw-status-badge status-${draw.status}`}>
                  {draw.status}
                </span>
              </div>

              {/* Jackpot */}
              <div className="jackpot-display">
                <div className="jackpot-label">🏆 Jackpot Prize</div>
                <div className="jackpot-amount">
                  ₹{Number(draw.jackpot_amount).toLocaleString('en-IN')}
                </div>
                {draw.jackpot_rolled_over && (
                  <div className="jackpot-sub">Includes rolled-over jackpot from previous month</div>
                )}
              </div>

              {/* Drawn numbers (if run) */}
              {draw.drawn_numbers.length > 0 && (
                <>
                  <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 0.6rem' }}>
                    {draw.status === 'simulated' ? '⚠️ Simulated numbers — not official yet' : '✅ Official drawn numbers'}
                  </p>
                  <div className="balls-row">
                    {draw.drawn_numbers.map((n) => {
                      const matched = draw.my_result?.matched_numbers.includes(n);
                      return <Ball key={n} n={n} type={matched ? 'matched' : 'drawn'} />;
                    })}
                  </div>
                </>
              )}

              {/* User's result */}
              {draw.my_result && draw.status === 'published' && (
                <div className={`my-result-banner ${resultClass(draw.my_result.prize_tier)}`} style={{ display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: draw.my_result.prize_tier !== 'none' ? '1rem' : '0' }}>
                    <span className="result-icon">
                      {draw.my_result.prize_tier === '5_match' ? '🏆'
                        : draw.my_result.prize_tier === '4_match' ? '🥈'
                        : draw.my_result.prize_tier === '3_match' ? '🥉' : '😔'}
                    </span>
                    <div>
                      <div className="result-title">{PRIZE_LABELS[draw.my_result.prize_tier]}</div>
                      <div className="result-sub">
                        {draw.my_result.match_count} match{draw.my_result.match_count !== 1 ? 'es' : ''} · 
                        Prize: {draw.my_result.prize_tier !== 'none'
                          ? `₹${Number(draw.my_result.prize_amount).toLocaleString('en-IN')}`
                          : '—'}
                      </div>
                    </div>
                  </div>
                  
                  {draw.my_result.prize_tier !== 'none' && (
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.88rem', color: draw.my_result.verification_status === 'approved' ? '#10b981' : draw.my_result.verification_status === 'rejected' ? '#ef4444' : '#fbbf24' }}>
                        {VERIFICATION_LABELS[draw.my_result.verification_status]}
                      </p>
                      {draw.my_result.verification_status === 'pending' || draw.my_result.verification_status === 'rejected' ? (
                        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                          <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} style={{ fontSize: '0.8rem' }} />
                          <button 
                            className="submit-entry-btn" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                            onClick={() => handleUploadProof(draw.my_result!.id)}
                            disabled={!uploadFile || submitting}
                          >
                            {submitting ? 'Uploading...' : 'Upload Proof'}
                          </button>
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                          Payment Status: <strong style={{ color: draw.my_result.payment_status === 'paid' ? '#10b981' : '#f59e0b' }}>{draw.my_result.payment_status.toUpperCase()}</strong>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Prize tiers */}
              <div className="prize-tiers">
                <div className="prize-tier-card jackpot">
                  <span className="tier-icon">🏆</span>
                  <p className="tier-match">5-Number Match</p>
                  <p className="tier-prize">₹{Number(draw.jackpot_amount).toLocaleString('en-IN')}</p>
                </div>
                <div className="prize-tier-card second">
                  <span className="tier-icon">🥈</span>
                  <p className="tier-match">4-Number Match</p>
                  <p className="tier-prize">₹5,000</p>
                </div>
                <div className="prize-tier-card third">
                  <span className="tier-icon">🥉</span>
                  <p className="tier-match">3-Number Match</p>
                  <p className="tier-prize">₹1,000</p>
                </div>
              </div>

              {/* Entry picker (only when pending) */}
              {draw.status === 'pending' && (
                <div className="entry-section">
                  <h3>Pick Your 5 Numbers</h3>

                  {draw.my_entry && (
                    <p style={{ fontSize: '0.82rem', color: '#6ee7b7', marginBottom: '0.8rem',
                                 background: 'rgba(16,185,129,0.08)', borderRadius: '8px', padding: '0.4rem 0.7rem' }}>
                      Current entry: [{draw.my_entry.join(', ')}] — you can update until draw closes
                    </p>
                  )}

                  <div className="number-grid">
                    {Array.from({ length: 49 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        className={`num-btn ${selected.includes(n) ? 'selected' : ''}`}
                        onClick={() => toggleNumber(n)}
                        disabled={!selected.includes(n) && selected.length >= 5}
                        id={`num-btn-${n}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <div className="entry-actions">
                    <button
                      id="submit-entry-btn"
                      className="submit-entry-btn"
                      onClick={handleSubmit}
                      disabled={selected.length !== 5 || submitting}
                    >
                      {submitting ? 'Submitting…' : draw.my_entry ? 'Update Entry' : 'Submit Entry'}
                    </button>
                    <button className="clear-btn" onClick={() => setSelected([])}>Clear</button>
                    <span className="selected-count">{selected.length}/5 selected</span>
                  </div>
                </div>
              )}

              {/* Your numbers when draw is run */}
              {draw.my_entry && draw.drawn_numbers.length > 0 && (
                <div style={{ marginTop: '1.2rem' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                    Your numbers
                  </p>
                  <div className="balls-row">
                    {draw.my_entry.map((n) => {
                      const matched = draw.drawn_numbers.includes(n);
                      return <Ball key={n} n={n} type={matched ? 'matched' : 'user'} />;
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="draw-empty">
              <p>🎰 No active draw right now.<br/>Check back next month!</p>
            </div>
          )
        )}

        {/* ── Tab: History ──────────────────────────────────────────────── */}
        {tab === 'history' && (
          history.length === 0 ? (
            <div className="draw-empty">
              <p>You haven't participated in any draws yet.</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((r) => (
                <div key={r.draw_id} className="history-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                    <div>
                      <p className="history-month">
                        {new Date(r.year, r.month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="history-drawn">
                        Drawn: {r.drawn_numbers.join(' · ')} &nbsp;|&nbsp; Yours: {r.my_numbers.join(' · ')}
                        {r.matched.length > 0 && <> &nbsp;|&nbsp; <span style={{ color: '#10b981' }}>Matched: {r.matched.join(', ')}</span></>}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`history-prize-badge ${prizeClass(r.prize_tier)}`}>
                        {PRIZE_LABELS[r.prize_tier]}
                      </span>
                      {r.prize_tier !== 'none' && (
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>
                          ₹{Number(r.prize_amount).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {r.prize_tier !== 'none' && (
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <p style={{ margin: '0 0 0.2rem', fontWeight: 600, fontSize: '0.82rem', color: r.verification_status === 'approved' ? '#10b981' : r.verification_status === 'rejected' ? '#ef4444' : '#fbbf24' }}>
                          {VERIFICATION_LABELS[r.verification_status]}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                          Payment Status: <strong style={{ color: r.payment_status === 'paid' ? '#10b981' : '#f59e0b' }}>{r.payment_status.toUpperCase()}</strong>
                        </p>
                      </div>
                      
                      {(r.verification_status === 'pending' || r.verification_status === 'rejected') && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="file" accept="image/*" onChange={(e) => {
                            setUploadingId(r.result_id);
                            setUploadFile(e.target.files?.[0] || null);
                          }} style={{ fontSize: '0.75rem', width: '160px' }} />
                          <button 
                            className="submit-entry-btn" style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}
                            onClick={() => handleUploadProof(r.result_id)}
                            disabled={uploadingId !== r.result_id || !uploadFile || submitting}
                          >
                            {submitting && uploadingId === r.result_id ? 'Uploading...' : 'Upload'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}
