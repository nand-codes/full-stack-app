import { useState, type FormEvent, type ChangeEvent } from 'react';
import { loginUser } from '../api/auth';
import './Login.css';

interface FormData {
  email: string;
  password: string;
}

interface FieldError {
  email?: string;
  password?: string;
  general?: string;
}

export default function Login() {
  const [form, setForm] = useState<FormData>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const validate = (): boolean => {
    const newErrors: FieldError = {};
    if (!form.email) newErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email address.';
    if (!form.password) newErrors.password = 'Password is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await loginUser(form);
      localStorage.setItem('access_token', data.tokens.access);
      localStorage.setItem('refresh_token', data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      // Redirect to dashboard (update this path as needed)
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string[]> } };
      const serverErrors = axiosErr?.response?.data ?? {};
      const mapped: FieldError = {};
      if (serverErrors.email) mapped.email = serverErrors.email[0];
      if (serverErrors.password) mapped.password = serverErrors.password[0];
      if (serverErrors.non_field_errors) mapped.general = serverErrors.non_field_errors[0];
      if (Object.keys(mapped).length === 0) mapped.general = 'Login failed. Please try again.';
      setErrors(mapped);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* Left decorative panel */}
      <div className="login-left">
        <div className="brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">FullStack App</span>
        </div>
        <div className="left-content">
          <h1>Welcome back</h1>
          <p>Sign in to continue where you left off and access your personalized dashboard.</p>
          <div className="stats-row">
            <div className="stat">
              <span className="stat-value">10k+</span>
              <span className="stat-label">Users</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">99.9%</span>
              <span className="stat-label">Uptime</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">256-bit</span>
              <span className="stat-label">Encryption</span>
            </div>
          </div>
        </div>
        <div className="left-glow" />
        <div className="left-glow glow-2" />
      </div>

      {/* Right panel — form */}
      <div className="login-right">
        <div className="login-card">
          <div className="card-header">
            <div className="avatar-ring">
              <span className="avatar-icon">👤</span>
            </div>
            <h2 className="card-title">Sign In</h2>
            <p className="card-subtitle">Enter your credentials to continue</p>
          </div>

          {errors.general && (
            <div className="alert-error" role="alert">{errors.general}</div>
          )}

          <form onSubmit={handleSubmit} noValidate id="login-form">
            {/* Email */}
            <div className={`field ${errors.email ? 'field--error' : ''}`}>
              <label htmlFor="login-email">Email address</label>
              <div className="input-wrapper">
                <span className="input-icon">✉</span>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className={`field ${errors.password ? 'field--error' : ''}`}>
              <div className="label-row">
                <label htmlFor="login-password">Password</label>
                <a href="/forgot-password" className="forgot-link">Forgot password?</a>
              </div>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="login-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Your password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              className="btn-primary btn-full"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>

          <div className="divider">
            <span>or</span>
          </div>

          <p className="register-link">
            Don't have an account? <a href="/register">Create one</a>
          </p>
        </div>
      </div>
    </div>
  );
}
