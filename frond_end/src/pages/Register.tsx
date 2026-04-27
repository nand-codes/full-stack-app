import { useState, type FormEvent, type ChangeEvent } from 'react';
import { registerUser, type RegisterPayload } from '../api/auth';
import './Register.css';

interface FormData extends RegisterPayload {}

interface FieldError {
  email?: string;
  username?: string;
  password?: string;
  password2?: string;
  general?: string;
}

export default function Register() {
  const [form, setForm] = useState<FormData>({
    email: '',
    username: '',
    password: '',
    password2: '',
  });
  const [errors, setErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const validate = (): boolean => {
    const newErrors: FieldError = {};
    if (!form.email) newErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email address.';
    if (!form.username) newErrors.username = 'Username is required.';
    if (!form.password) newErrors.password = 'Password is required.';
    else if (form.password.length < 6) newErrors.password = 'Password must be at least 6 characters.';
    if (!form.password2) newErrors.password2 = 'Please confirm your password.';
    else if (form.password !== form.password2) newErrors.password2 = 'Passwords do not match.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await registerUser(form);
      localStorage.setItem('access_token', data.tokens.access);
      localStorage.setItem('refresh_token', data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string[]> } };
      const serverErrors = axiosErr?.response?.data ?? {};
      const mapped: FieldError = {};
      if (serverErrors.email) mapped.email = serverErrors.email[0];
      if (serverErrors.username) mapped.username = serverErrors.username[0];
      if (serverErrors.password) mapped.password = serverErrors.password[0];
      if (serverErrors.non_field_errors) mapped.general = serverErrors.non_field_errors[0];
      if (Object.keys(mapped).length === 0) mapped.general = 'Registration failed. Please try again.';
      setErrors(mapped);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="register-wrapper">
        <div className="register-card success-card">
          <div className="success-icon">✓</div>
          <h2>You're in!</h2>
          <p>Your account has been created successfully.</p>
          <a href="/login" className="btn-primary">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="register-wrapper">
      {/* Left panel */}
      <div className="register-left">
        <div className="brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">FullStack App</span>
        </div>
        <div className="left-content">
          <h1>Start your journey today</h1>
          <p>Join thousands of users and experience the next generation platform.</p>
          <ul className="feature-list">
            <li><span className="check">✓</span> Secure JWT authentication</li>
            <li><span className="check">✓</span> Role-based access control</li>
            <li><span className="check">✓</span> Lightning-fast performance</li>
          </ul>
        </div>
        <div className="left-glow" />
      </div>

      {/* Right panel — form */}
      <div className="register-right">
        <div className="register-card">
          <h2 className="card-title">Create Account</h2>
          <p className="card-subtitle">Fill in the details to get started</p>

          {errors.general && (
            <div className="alert-error">{errors.general}</div>
          )}

          <form onSubmit={handleSubmit} noValidate id="register-form">
            {/* Email */}
            <div className={`field ${errors.email ? 'field--error' : ''}`}>
              <label htmlFor="email">Email address</label>
              <div className="input-wrapper">
                <span className="input-icon">✉</span>
                <input
                  id="email"
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

            {/* Username */}
            <div className={`field ${errors.username ? 'field--error' : ''}`}>
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <span className="input-icon">@</span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="johndoe"
                  value={form.username}
                  onChange={handleChange}
                  autoComplete="username"
                />
              </div>
              {errors.username && <span className="field-error">{errors.username}</span>}
            </div>

            {/* Password */}
            <div className={`field ${errors.password ? 'field--error' : ''}`}>
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
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

            {/* Confirm Password */}
            <div className={`field ${errors.password2 ? 'field--error' : ''}`}>
              <label htmlFor="password2">Confirm Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password2"
                  name="password2"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={form.password2}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>
              {errors.password2 && <span className="field-error">{errors.password2}</span>}
            </div>

            <button
              type="submit"
              id="register-submit-btn"
              className="btn-primary btn-full"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>

          <p className="login-link">
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
