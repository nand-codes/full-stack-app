import { useEffect, useState } from 'react';
import { addScore, getMyScores, type ScoreRecord } from '../api/auth';
import './Scores.css';

export default function Scores() {
  const [scores, setScores]                    = useState<ScoreRecord[]>([]);
  const [loading, setLoading]                  = useState(true);
  const [scoreInput, setScoreInput]            = useState('');
  const [dateInput, setDateInput]              = useState(new Date().toISOString().split('T')[0]);
  const [adding, setAdding]                    = useState(false);
  const [error, setError]                      = useState('');
  const [success, setSuccess]                  = useState('');
  const [showForm, setShowForm]                = useState(false);
  const [subscriptionRequired, setSubRequired] = useState(false);

  const fetchScores = async () => {
    try {
      const { data } = await getMyScores();
      setScores(data);
      setSubRequired(false);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 403) setSubRequired(true);
      else setError('Failed to load scores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = '/login'; return; }
    fetchScores();
  }, []);

  const handleAdd = async () => {
    const val = Number(scoreInput);
    if (!scoreInput || isNaN(val) || val < 1 || val > 45) {
      setError('Enter a Stableford score between 1 and 45.');
      return;
    }
    setAdding(true);
    setError('');
    setSuccess('');
    try {
      await addScore({ score: val, date: dateInput });
      setSuccess(`Score of ${val} pts saved!`);
      setScoreInput('');
      setShowForm(false);
      await fetchScores();
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 403) setError('Subscription required to add scores.');
      else setError('Failed to save score. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const getRating = (pts: number) => {
    if (pts >= 40) return { label: 'Excellent', cls: 'excellent' };
    if (pts >= 36) return { label: 'Good',      cls: 'good' };
    if (pts >= 28) return { label: 'Average',   cls: 'average' };
    return            { label: 'Below Par',  cls: 'low' };
  };

  return (
    <div className="scores-wrapper">
      <nav className="dash-nav">
        <div className="nav-brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">FullStack App</span>
        </div>
        <div className="nav-right">
          <a href="/dashboard" className="nav-link">← Dashboard</a>
        </div>
      </nav>

      <main className="scores-main">
        {/* Header */}
        <div className="scores-header">
          <div>
            <h1 className="scores-title">My Scores</h1>
            <p className="scores-subtitle">Stableford format · last 5 rounds</p>
          </div>
          {!subscriptionRequired && (
            <button
              id="add-score-btn"
              className="btn-primary"
              onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
            >
              {showForm ? '✕ Cancel' : '+ Add Score'}
            </button>
          )}
        </div>

        {/* Add Score Form */}
        {showForm && (
          <div className="add-form-card">
            <h3>Record Stableford Score</h3>
            <p className="form-hint">Enter your total Stableford points (1–45) and the date played.</p>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="score-input">Stableford Points</label>
                <input
                  id="score-input"
                  type="number"
                  min="1"
                  max="45"
                  placeholder="e.g. 36"
                  value={scoreInput}
                  onChange={e => setScoreInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <div className="form-field">
                <label htmlFor="date-input">Date Played</label>
                <input
                  id="date-input"
                  type="date"
                  value={dateInput}
                  onChange={e => setDateInput(e.target.value)}
                />
              </div>
              <button
                id="submit-score-btn"
                className="btn-primary btn-submit"
                onClick={handleAdd}
                disabled={adding}
              >
                {adding ? <span className="spinner" /> : 'Save'}
              </button>
            </div>
            {error   && <p className="msg-error">{error}</p>}
            {success && <p className="msg-success">{success}</p>}
          </div>
        )}

        {/* Scores list */}
        {loading ? (
          <div className="loading-state">
            <span className="big-spinner" />
            <p>Loading scores…</p>
          </div>
        ) : subscriptionRequired ? (
          <div className="empty-state">
            <span className="empty-icon">🔒</span>
            <h3>Subscription Required</h3>
            <p>You need an active subscription to track and view your scores.</p>
            <button
              className="btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={() => window.location.href = '/subscription'}
            >
              View Plans
            </button>
          </div>
        ) : scores.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🏌️</span>
            <h3>No rounds yet</h3>
            <p>Hit "+ Add Score" to record your first Stableford round!</p>
          </div>
        ) : (
          <div className="scores-list">
            {scores.map((s, i) => {
              const rating = getRating(s.score);
              return (
                <div className="score-card" key={s.id} style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="score-rank">#{i + 1}</div>
                  <div className="score-info">
                    <span className="score-date">
                      {new Date(s.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="score-value">{s.score} <span className="score-unit">pts</span></div>
                  <span className={`score-badge ${rating.cls}`}>{rating.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
