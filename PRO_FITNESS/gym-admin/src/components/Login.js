import React, { useState } from 'react';
import { login as apiLogin } from '../api';
import { setToken, setUserName, getRole } from '../auth';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ onLoginSuccess, onGoRegister, onGoLanding }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);

  const validate = () => {
    const e = {};
    if (!email)                    e.email    = 'Email is required.';
    else if (!emailRegex.test(email)) e.email = 'Enter a valid email address.';
    if (!password)                 e.password = 'Password is required.';
    else if (password.length < 6)  e.password = 'Password must be at least 6 characters.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await apiLogin({ email, password });
      const { token, message, first_name } = res.data;
      if (!token) { setApiError(message || 'Invalid credentials.'); return; }
      setToken(token);
      if (first_name) setUserName(first_name);
      onLoginSuccess(getRole());
    } catch (err) {
      setApiError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, type, placeholder, value, onChange) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        type={type}
        className={`form-input ${errors[name] ? 'input-error' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value); setErrors(p => ({ ...p, [name]: '' })); }}
      />
      {errors[name] && <span className="field-error">{errors[name]}</span>}
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <button className="auth-back" onClick={onGoLanding}>← Back</button>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="landing-logo-icon">P</div>
          <div>
            <div className="landing-logo-name">ProFitness</div>
            <div className="landing-logo-sub">Admin Portal</div>
          </div>
        </div>

        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-sub">Sign in to your dashboard</p>

        {apiError && <div className="error-banner">{apiError}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {field('email',    'Email Address', 'email',    'you@profitness.com', email,    setEmail)}
          {field('password', 'Password',      'password', '••••••••',           password, setPassword)}

          <button type="submit" className="landing-btn-filled auth-submit" disabled={loading}>
            {loading ? <><span className="auth-spinner" />Signing in…</> : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <button className="auth-link" onClick={onGoRegister}>View plans &amp; register</button>
        </p>
      </div>
    </div>
  );
}
