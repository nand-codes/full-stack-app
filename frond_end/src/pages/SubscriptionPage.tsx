import { useEffect, useState } from 'react';
import {
  createOrder, verifyPayment, getMySubscription,
  listCharities, getMyCharity, selectMyCharity,
  type SubscriptionInfo, type Charity,
} from '../api/auth';
import './SubscriptionPage.css';

declare global {
  interface Window {
    Razorpay: new (options: object) => { open: () => void };
  }
}

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: 2500,
    period: '/ month',
    description: 'Perfect for trying out the platform',
    features: ['Full score tracking', 'Subscription badge', 'Email support', 'Cancel anytime'],
    badge: null,
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: 20000,
    period: '/ year',
    description: 'Best value — save ₹10,000 vs monthly',
    features: ['Everything in Monthly', 'Priority support', 'Early access to features', '2 months free'],
    badge: 'Best Value',
  },
];

export default function SubscriptionPage() {
  const [currentSub, setCurrentSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading]       = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage]       = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Charity selection state
  const [charities, setCharities]         = useState<Charity[]>([]);
  const [selectedCharity, setSelectedCharity] = useState<Charity | null>(null);
  const [contribution, setContribution]   = useState(10);
  const [charityStep, setCharityStep]     = useState(false); // show charity picker
  const [pendingPlan, setPendingPlan]     = useState<string | null>(null);
  const [savingCharity, setSavingCharity] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = '/login'; return; }

    // Load Razorpay script dynamically
    if (!document.getElementById('razorpay-script')) {
      const script = document.createElement('script');
      script.id  = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(script);
    }

    Promise.all([
      getMySubscription().catch(() => null),
      listCharities().catch(() => null),
      getMyCharity().catch(() => null),
    ]).then(([sub, chars, mc]) => {
      if (sub)   setCurrentSub(sub.data);
      if (chars) setCharities(chars.data);
      if (mc?.data?.charity) setSelectedCharity(mc.data.charity);
    }).finally(() => setLoading(false));
  }, []);

  /* ── Step 1: user clicks Subscribe → show charity picker ─────────────── */
  const handleSubscribeClick = (planId: string) => {
    setPendingPlan(planId);
    setCharityStep(true);
    setMessage(null);
  };

  /* ── Step 2: user confirms charity → save selection then pay ─────────── */
  const handleConfirmCharity = async () => {
    if (!selectedCharity) {
      setMessage({ text: 'Please select a charity before proceeding.', type: 'error' });
      return;
    }
    setSavingCharity(true);
    try {
      await selectMyCharity({ charity_id: selectedCharity.id, contribution_percentage: contribution });
    } catch {
      /* not fatal — continue to payment */
    } finally {
      setSavingCharity(false);
    }
    setCharityStep(false);
    await initiatePayment(pendingPlan!);
  };

  /* ── Razorpay payment ─────────────────────────────────────────────────── */
  const initiatePayment = async (planId: string) => {
    setProcessing(planId);
    setMessage(null);
    try {
      const { data: order } = await createOrder(planId);
      const options = {
        key:         order.key_id,
        amount:      order.amount,
        currency:    order.currency,
        name:        order.name,
        description: order.description,
        order_id:    order.order_id,
        prefill: {
          name:  localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).username : '',
          email: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).email    : '',
        },
        theme: { color: '#7c3aed' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              plan: planId,
            });
            setMessage({ text: `🎉 ${planId.charAt(0).toUpperCase() + planId.slice(1)} subscription activated! Your charity contribution is set ✅`, type: 'success' });
            const { data } = await getMySubscription();
            setCurrentSub(data);
          } catch {
            setMessage({ text: 'Payment verification failed. Contact support.', type: 'error' });
          }
          setProcessing(null);
        },
        modal: { ondismiss: () => setProcessing(null) },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setMessage({ text: 'Could not initiate payment. Please try again.', type: 'error' });
      setProcessing(null);
    }
  };

  /* ── Charity picker modal ─────────────────────────────────────────────── */
  const CharityPicker = () => (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1040, #24243e)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '24px', padding: '2rem',
        maxWidth: '580px', width: '100%',
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <h2 style={{ color: '#a78bfa', margin: '0 0 0.3rem', fontSize: '1.4rem' }}>Choose a Charity 💚</h2>
        <p style={{ color: '#94a3b8', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>
          A portion of your subscription goes to your chosen charity
        </p>

        {message && (
          <div style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.88rem' }}>
            {message.text}
          </div>
        )}

        {charities.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center' }}>No charities available.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {charities.map((c) => {
              const isChosen = selectedCharity?.id === c.id;
              return (
                <div
                  key={c.id}
                  id={`picker-charity-${c.slug}`}
                  onClick={() => setSelectedCharity(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.9rem 1.1rem',
                    borderRadius: '14px', cursor: 'pointer',
                    border: isChosen ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                    background: isChosen ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                    transition: 'all 0.2s',
                  }}
                >
                  {c.image
                    ? <img src={c.image} alt={c.name} style={{ width: 48, height: 48, borderRadius: '10px', objectFit: 'cover' }} />
                    : <div style={{ width: 48, height: 48, borderRadius: '10px', background: 'rgba(124,58,237,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>💚</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>{c.name}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.short_description || c.description.slice(0, 80)}
                    </p>
                  </div>
                  {isChosen && <span style={{ color: '#10b981', fontWeight: 700, fontSize: '1.2rem' }}>✓</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Contribution % */}
        {selectedCharity && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ color: '#a78bfa', fontSize: '0.88rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Contribution: {contribution}% of subscription
              {' '}(₹{((( pendingPlan === 'yearly' ? 20000 : 2500) * contribution) / 100).toLocaleString('en-IN')})
            </label>
            <input
              type="range" min={10} max={50} step={5}
              value={contribution}
              onChange={(e) => setContribution(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#7c3aed' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
              <span>10% (min)</span><span>50% (max)</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button
            onClick={() => { setCharityStep(false); setMessage(null); }}
            style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)',
                     background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}
          >
            Cancel
          </button>
          <button
            id="confirm-charity-btn"
            onClick={handleConfirmCharity}
            disabled={savingCharity || !selectedCharity}
            style={{ flex: 2, padding: '0.75rem', borderRadius: '12px', border: 'none',
                     background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                     color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: !selectedCharity ? 0.5 : 1 }}
          >
            {savingCharity ? 'Saving…' : 'Continue to Payment →'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="sub-page-wrapper">
      {charityStep && <CharityPicker />}

      {/* Navbar */}
      <nav className="dash-nav">
        <div className="nav-brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">FullStack App</span>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <a href="/charities" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500 }}>💚 Charities</a>
          <a href="/dashboard" className="nav-back">← Dashboard</a>
        </div>
      </nav>

      <main className="sub-page-main">
        {/* Header */}
        <div className="sub-page-header">
          <h1>Choose Your Plan</h1>
          <p>Unlock full access · Select a charity during checkout to give back 💚</p>
        </div>

        {/* Current subscription banner */}
        {!loading && currentSub && (
          <div className="current-sub-banner">
            <span className="banner-icon">✓</span>
            <div>
              <strong>Active: {currentSub.plan.charAt(0).toUpperCase() + currentSub.plan.slice(1)} Plan</strong>
              <span>{currentSub.days_left} days remaining</span>
            </div>
          </div>
        )}

        {/* Alert */}
        {message && (
          <div className={`sub-alert ${message.type === 'success' ? 'sub-alert--success' : 'sub-alert--error'}`}>
            {message.text}
          </div>
        )}

        {/* Plan cards */}
        <div className="plans-grid">
          {PLANS.map((plan) => {
            const isActive = currentSub?.plan === plan.id;
            const isBusy   = processing === plan.id;
            return (
              <div
                key={plan.id}
                className={`plan-card ${plan.id === 'yearly' ? 'plan-card--featured' : ''} ${isActive ? 'plan-card--active' : ''}`}
              >
                {plan.badge  && <span className="plan-badge">{plan.badge}</span>}
                {isActive    && <span className="plan-badge plan-badge--active">Current Plan</span>}

                <div className="plan-icon">{plan.id === 'yearly' ? '⭐' : '📅'}</div>
                <h2 className="plan-name">{plan.label}</h2>
                <p className="plan-desc">{plan.description}</p>

                <div className="plan-price">
                  <span className="currency">₹</span>
                  <span className="amount">{plan.price.toLocaleString('en-IN')}</span>
                  <span className="period">{plan.period}</span>
                </div>

                {plan.id === 'yearly' && <p className="plan-savings">Save ₹10,000 vs monthly</p>}

                {/* Charity line */}
                {selectedCharity && (
                  <p style={{ fontSize: '0.78rem', color: '#6ee7b7', margin: '0 0 0.8rem',
                               background: 'rgba(16,185,129,0.08)', borderRadius: '8px', padding: '0.4rem 0.7rem' }}>
                    💚 {contribution}% → {selectedCharity.name}
                    {' '}(₹{((plan.price * contribution) / 100).toLocaleString('en-IN')})
                  </p>
                )}

                <ul className="plan-features">
                  {plan.features.map((f) => (
                    <li key={f}><span className="feature-check">✓</span>{f}</li>
                  ))}
                </ul>

                <button
                  id={`subscribe-${plan.id}-btn`}
                  className={`plan-btn ${plan.id === 'yearly' ? 'plan-btn--featured' : ''}`}
                  onClick={() => handleSubscribeClick(plan.id)}
                  disabled={isBusy || !!processing}
                >
                  {isBusy
                    ? <><span className="spinner" /> Processing…</>
                    : isActive ? 'Renew Plan' : 'Subscribe Now'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Trust badges */}
        <div className="trust-row">
          <span>🔒 Secure Payment</span>
          <span>✓ Instant Activation</span>
          <span>💚 Charity Giving</span>
          <span>↩ Cancel Anytime</span>
        </div>
      </main>
    </div>
  );
}
