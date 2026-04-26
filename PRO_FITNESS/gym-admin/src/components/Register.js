import React, { useState } from 'react';
import { register as apiRegister, login as apiLogin, createMembership } from '../api';
import { setToken, setUserName, getRole, getUserId } from '../auth';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_RULES = [
  { label: 'At least 8 characters',      test: p => p.length >= 8 },
  { label: 'One uppercase letter (A–Z)',  test: p => /[A-Z]/.test(p) },
  { label: 'One number (0–9)',            test: p => /[0-9]/.test(p) },
  { label: 'One special character (!@#…)',test: p => /[^A-Za-z0-9]/.test(p) },
];

function PasswordStrength({ password }) {
  if (!password) return null;
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
  const pct    = (passed / PASSWORD_RULES.length) * 100;
  const color  = passed <= 1 ? '#ff6464' : passed <= 2 ? '#facc15' : passed <= 3 ? '#d4af87' : '#4ade80';
  const label  = passed <= 1 ? 'Weak' : passed <= 2 ? 'Fair' : passed <= 3 ? 'Good' : 'Strong';

  return (
    <div className="pw-strength">
      <div className="pw-strength-bar">
        <div className="pw-strength-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="pw-strength-label" style={{ color }}>{label}</span>
      <ul className="pw-rules">
        {PASSWORD_RULES.map((r, i) => {
          const ok = r.test(password);
          return (
            <li key={i} className={`pw-rule ${ok ? 'pw-rule-ok' : 'pw-rule-fail'}`}>
              <span>{ok ? '✓' : '✗'}</span> {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Register({ selectedPlan, onLoginSuccess, onGoLogin, onGoLanding }) {
  const [form, setForm]       = useState({ f_name:'', l_name:'', email:'', phone:'', address:'', password:'', confirm:'' });
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = k => v => { setForm(f => ({ ...f, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.f_name.trim())             e.f_name   = 'First name is required.';
    if (!form.l_name.trim())             e.l_name   = 'Last name is required.';
    if (!form.email)                     e.email    = 'Email is required.';
    else if (!emailRegex.test(form.email)) e.email  = 'Enter a valid email address.';
    if (form.phone && !/^\d{10}$/.test(form.phone.replace(/\D/g, '')))
                                         e.phone    = 'Phone must be exactly 10 digits.';
    if (!form.password)                                           e.password = 'Password is required.';
    else if (PASSWORD_RULES.some(r => !r.test(form.password)))   e.password = 'Password does not meet all requirements.';
    if (!form.confirm)                   e.confirm  = 'Please confirm your password.';
    else if (form.password !== form.confirm) e.confirm = 'Passwords do not match.';
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
      const { f_name, l_name, email, phone, address, password } = form;
      await apiRegister({ f_name, l_name, email, phone, address, role: 'client', password });

      // Auto-login to get token
      const res = await apiLogin({ email, password });
      const { token } = res.data;
      if (!token) { onGoLogin(); return; }

      setToken(token);
      setUserName(form.f_name);

      // Create membership if a plan was selected
      if (selectedPlan) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        try {
          await createMembership({
            client_id: getUserId(),
            plan_id:   selectedPlan.id,
            start_date: today,
          });
        } catch {
          // Non-fatal — user is still registered, they can add membership later
        }
      }

      onLoginSuccess(getRole());
    } catch (err) {
      setApiError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, type, placeholder, fullWidth = false) => (
    <div className={`form-group ${fullWidth ? 'auth-full' : ''}`}>
      <label className="form-label">{label}</label>
      <input
        type={type}
        className={`form-input ${errors[key] ? 'input-error' : ''}`}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => set(key)(e.target.value)}
      />
      {errors[key] && <span className="field-error">{errors[key]}</span>}
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <button className="auth-back" onClick={onGoLanding}>← Back</button>

      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <div className="landing-logo-icon">P</div>
          <div>
            <div className="landing-logo-name">ProFitness</div>
            <div className="landing-logo-sub">Admin Portal</div>
          </div>
        </div>

        <h2 className="auth-title">Create your account</h2>
        <p className="auth-sub">Set up your profile to get started</p>

        {/* Selected plan banner */}
        {selectedPlan ? (
          <div className="register-plan-banner">
            <div>
              <div className="register-plan-name">✦ {selectedPlan.name}</div>
              <div className="register-plan-price">
                ${selectedPlan.price} / month &nbsp;·&nbsp;
                {selectedPlan.session_limit
                  ? `${selectedPlan.session_limit} sessions`
                  : 'Unlimited sessions'}
              </div>
            </div>
            <button className="register-plan-change" onClick={onGoLanding}>
              Change plan
            </button>
          </div>
        ) : (
          <div className="register-plan-banner" style={{ borderColor: 'rgba(255,100,100,0.35)', background: 'rgba(255,100,100,0.06)' }}>
            <div>
              <div className="register-plan-name" style={{ color: '#ff8080' }}>No plan selected</div>
              <div className="register-plan-price">Go back to pricing to choose a membership</div>
            </div>
            <button className="register-plan-change" onClick={onGoLanding}>
              View plans
            </button>
          </div>
        )}

        {apiError && <div className="error-banner">{apiError}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-form-grid">
            {field('f_name',   'First Name *',       'text',     'Aryan')}
            {field('l_name',   'Last Name *',        'text',     'Bhat')}
            {field('email',    'Email Address *',    'email',    'you@profitness.com', true)}
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="tel"
                className={`form-input ${errors.phone ? 'input-error' : ''}`}
                placeholder="5550001234"
                value={form.phone}
                maxLength={10}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  set('phone')(digits);
                }}
              />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>
            {field('address',  'Address',            'text',     '123 Gym St')}
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                type="password"
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="••••••••"
                value={form.password}
                onChange={e => set('password')(e.target.value)}
              />
              <PasswordStrength password={form.password} />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
            {field('confirm',  'Confirm Password *', 'password', '••••••••')}
          </div>

          <button type="submit" className="landing-btn-filled auth-submit" disabled={loading}>
            {loading ? <><span className="auth-spinner" />Creating account…</> : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button className="auth-link" onClick={onGoLogin}>Sign in</button>
        </p>
      </div>
    </div>
  );
}
