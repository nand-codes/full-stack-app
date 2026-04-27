import { useEffect, useState } from 'react';
import { createOrder, verifyPayment, getMySubscription, type SubscriptionInfo } from '../api/auth';
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

    getMySubscription()
      .then(({ data }) => setCurrentSub(data))
      .catch(() => setCurrentSub(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planId: string) => {
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
          name:  localStorage.getItem('user')
            ? JSON.parse(localStorage.getItem('user')!).username
            : '',
          email: localStorage.getItem('user')
            ? JSON.parse(localStorage.getItem('user')!).email
            : '',
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
            setMessage({ text: `🎉 ${planId.charAt(0).toUpperCase() + planId.slice(1)} subscription activated!`, type: 'success' });
            // Refresh subscription info
            const { data } = await getMySubscription();
            setCurrentSub(data);
          } catch {
            setMessage({ text: 'Payment verification failed. Contact support.', type: 'error' });
          }
          setProcessing(null);
        },
        modal: {
          ondismiss: () => setProcessing(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setMessage({ text: 'Could not initiate payment. Please try again.', type: 'error' });
      setProcessing(null);
    }
  };

  return (
    <div className="sub-page-wrapper">
      {/* Navbar */}
      <nav className="dash-nav">
        <div className="nav-brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">FullStack App</span>
        </div>
        <a href="/dashboard" className="nav-back">← Dashboard</a>
      </nav>

      <main className="sub-page-main">
        {/* Header */}
        <div className="sub-page-header">
          <h1>Choose Your Plan</h1>
          <p>Unlock full access to all features with a simple subscription</p>
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
            const isActive  = currentSub?.plan === plan.id;
            const isBusy    = processing === plan.id;

            return (
              <div
                key={plan.id}
                className={`plan-card ${plan.id === 'yearly' ? 'plan-card--featured' : ''} ${isActive ? 'plan-card--active' : ''}`}
              >
                {plan.badge && <span className="plan-badge">{plan.badge}</span>}
                {isActive   && <span className="plan-badge plan-badge--active">Current Plan</span>}

                <div className="plan-icon">{plan.id === 'yearly' ? '⭐' : '📅'}</div>
                <h2 className="plan-name">{plan.label}</h2>
                <p className="plan-desc">{plan.description}</p>

                <div className="plan-price">
                  <span className="currency">₹</span>
                  <span className="amount">{plan.price.toLocaleString('en-IN')}</span>
                  <span className="period">{plan.period}</span>
                </div>

                {plan.id === 'yearly' && (
                  <p className="plan-savings">Save ₹10,000 vs monthly</p>
                )}

                <ul className="plan-features">
                  {plan.features.map((f) => (
                    <li key={f}><span className="feature-check">✓</span>{f}</li>
                  ))}
                </ul>

                <button
                  id={`subscribe-${plan.id}-btn`}
                  className={`plan-btn ${plan.id === 'yearly' ? 'plan-btn--featured' : ''}`}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isBusy || !!processing}
                >
                  {isBusy
                    ? <><span className="spinner" /> Processing…</>
                    : isActive
                      ? 'Renew Plan'
                      : 'Subscribe Now'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Trust badges */}
        <div className="trust-row">
          <span>🔒 Secure Payment</span>
          <span>✓ Instant Activation</span>
          <span>📞 24/7 Support</span>
          <span>↩ Cancel Anytime</span>
        </div>
      </main>
    </div>
  );
}
