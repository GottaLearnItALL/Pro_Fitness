import React, { useState } from 'react';
import { register as apiRegister, login as apiLogin, createMembership } from '../api';
import { setToken, setUserName, setTimezone, getRole, getUserId } from '../auth';
import logo from '../assets/haachikologo.png';
import '../SignIn.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COUNTRY_CODES = [
  { code: '+1',  label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+91', label: 'IN +91' },
  { code: '+61', label: 'AU +61' },
  { code: '+81', label: 'JP +81' },
  { code: '+49', label: 'DE +49' },
  { code: '+33', label: 'FR +33' },
  { code: '+86', label: 'CN +86' },
  { code: '+55', label: 'BR +55' },
  { code: '+971',label: 'AE +971' },
  { code: '+65', label: 'SG +65' },
  { code: '+82', label: 'KR +82' },
  { code: '+39', label: 'IT +39' },
  { code: '+34', label: 'ES +34' },
  { code: '+52', label: 'MX +52' },
  { code: '+7',  label: 'RU +7' },
  { code: '+27', label: 'ZA +27' },
  { code: '+64', label: 'NZ +64' },
  { code: '+46', label: 'SE +46' },
  { code: '+41', label: 'CH +41' },
];

const COUNTRIES = [
  'United States','United Kingdom','India','Australia','Japan','Germany','France',
  'China','Brazil','United Arab Emirates','Singapore','South Korea','Italy','Spain',
  'Mexico','Russia','South Africa','New Zealand','Sweden','Switzerland','Canada',
  'Netherlands','Belgium','Austria','Norway','Denmark','Finland','Ireland','Portugal',
  'Poland','Turkey','Saudi Arabia','Thailand','Indonesia','Philippines','Malaysia',
  'Vietnam','Argentina','Colombia','Chile','Egypt','Nigeria','Kenya','Pakistan',
];

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
  const color  = passed <= 1 ? '#ef4444' : passed <= 2 ? '#f59e0b' : passed <= 3 ? '#4a7c3f' : '#22c55e';
  const label  = passed <= 1 ? 'Weak' : passed <= 2 ? 'Fair' : passed <= 3 ? 'Good' : 'Strong';

  return (
    <div className="si-pw-strength">
      <div className="si-pw-bar">
        <div className="si-pw-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="si-pw-label" style={{ color }}>{label}</span>
      <ul className="si-pw-rules">
        {PASSWORD_RULES.map((r, i) => {
          const ok = r.test(password);
          return (
            <li key={i} className={`si-pw-rule ${ok ? 'si-pw-ok' : 'si-pw-fail'}`}>
              <span>{ok ? '✓' : '✗'}</span> {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Register({ selectedPlan, onLoginSuccess, onGoLogin, onGoLanding }) {
  const [form, setForm]       = useState({
    f_name:'', l_name:'', email:'',
    phone:'', phone_code:'+1',
    country:'', city:'', street:'',
    password:'', confirm:''
  });
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
    if (form.phone && form.phone.replace(/\D/g, '').length < 6)
                                         e.phone    = 'Please enter a valid phone number.';
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
      const { f_name, l_name, email, phone, phone_code, country, city, street, password } = form;
      const address = [street, city, country].filter(Boolean).join(', ');
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await apiRegister({ f_name, l_name, email, phone: phone ? phone_code + phone : '', address, country, city, street, timezone, role: 'client', password });

      const res = await apiLogin({ email, password });
      const { token } = res.data;
      if (!token) { onGoLogin(); return; }

      setToken(token);
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      setUserName(form.f_name);

      if (selectedPlan) {
        const today = new Date().toISOString().split('T')[0];
        try {
          await createMembership({
            client_id: getUserId(),
            plan_id:   selectedPlan.id,
            start_date: today,
          });
        } catch {
          // Non-fatal
        }
      }

      onLoginSuccess(getRole());
    } catch (err) {
      setApiError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="si-page">
      {/* ── Left brand panel ── */}
      <div className="si-left">
        <div className="si-left-overlay" />
        <div className="si-left-content">
          <img src={logo} alt="Haachiko Fitness" className="si-left-logo" />
          <div className="si-left-title">HAACHIKO FITNESS</div>
          <div className="si-left-tagline">Where Fitness Meets Passion</div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="si-right">
        <button className="si-back" onClick={onGoLanding}>&larr; Back</button>

        <div className="si-card si-card-wide">
          {/* Logo */}
          <div className="si-card-logo">
            <img src={logo} alt="Haachiko" className="si-card-logo-img" />
            <div>
              <div className="si-card-brand">HAACHIKO FITNESS</div>
              <div className="si-card-sub-brand">Where Fitness Meets Passion</div>
            </div>
          </div>

          <h2 className="si-title">Create your account</h2>
          <p className="si-subtitle">Set up your profile to get started</p>

          {/* Selected plan banner */}
          {selectedPlan ? (
            <div className="si-plan-banner">
              <div>
                <div className="si-plan-name">{selectedPlan.name}</div>
                <div className="si-plan-price">
                  ${selectedPlan.price} / month &middot;{' '}
                  {selectedPlan.session_limit
                    ? `${selectedPlan.session_limit} sessions`
                    : 'Unlimited sessions'}
                </div>
              </div>
              <button className="si-plan-change" onClick={onGoLanding}>
                Change plan
              </button>
            </div>
          ) : (
            <div className="si-plan-banner si-plan-banner-warn">
              <div>
                <div className="si-plan-name si-plan-name-warn">No plan selected</div>
                <div className="si-plan-price">Go back to pricing to choose a membership</div>
              </div>
              <button className="si-plan-change" onClick={onGoLanding}>
                View plans
              </button>
            </div>
          )}

          {apiError && <div className="si-error-banner">{apiError}</div>}

          <form className="si-form" onSubmit={handleSubmit} noValidate>

            {/* ── Section: Personal Details ── */}
            <div className="si-section-label">Personal Details</div>
            <div className="si-form-grid">
              <div className="si-field">
                <label className="si-label">First Name *</label>
                <input
                  className={`si-input ${errors.f_name ? 'si-input-error' : ''}`}
                  placeholder="Aryan"
                  value={form.f_name}
                  onChange={e => set('f_name')(e.target.value)}
                />
                {errors.f_name && <span className="si-field-err">{errors.f_name}</span>}
              </div>
              <div className="si-field">
                <label className="si-label">Last Name *</label>
                <input
                  className={`si-input ${errors.l_name ? 'si-input-error' : ''}`}
                  placeholder="Bhat"
                  value={form.l_name}
                  onChange={e => set('l_name')(e.target.value)}
                />
                {errors.l_name && <span className="si-field-err">{errors.l_name}</span>}
              </div>
              <div className="si-field si-full">
                <label className="si-label">Email Address *</label>
                <input
                  type="email"
                  className={`si-input ${errors.email ? 'si-input-error' : ''}`}
                  placeholder="you@haachiko.com"
                  value={form.email}
                  onChange={e => set('email')(e.target.value)}
                />
                {errors.email && <span className="si-field-err">{errors.email}</span>}
              </div>
              <div className="si-field si-full">
                <label className="si-label">Phone</label>
                <div className="si-phone-row">
                  <select
                    className="si-input si-phone-code"
                    value={form.phone_code}
                    onChange={e => set('phone_code')(e.target.value)}
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    className={`si-input si-phone-number ${errors.phone ? 'si-input-error' : ''}`}
                    placeholder="5550001234"
                    value={form.phone}
                    maxLength={15}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 15);
                      set('phone')(digits);
                    }}
                  />
                </div>
                {errors.phone && <span className="si-field-err">{errors.phone}</span>}
              </div>
            </div>

            {/* ── Section: Address ── */}
            <div className="si-section-label">Address</div>
            <div className="si-form-grid">
              <div className="si-field">
                <label className="si-label">Country</label>
                <select
                  className="si-input"
                  value={form.country}
                  onChange={e => set('country')(e.target.value)}
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="si-field">
                <label className="si-label">City</label>
                <input
                  className="si-input"
                  placeholder="New York"
                  value={form.city}
                  onChange={e => set('city')(e.target.value)}
                />
              </div>
              <div className="si-field si-full">
                <label className="si-label">Street Address</label>
                <input
                  className="si-input"
                  placeholder="123 Gym St, Apt 4B"
                  value={form.street}
                  onChange={e => set('street')(e.target.value)}
                />
              </div>
            </div>

            {/* ── Section: Security ── */}
            <div className="si-section-label">Security</div>
            <div className="si-form-grid">
              <div className="si-field">
                <label className="si-label">Password *</label>
                <input
                  type="password"
                  className={`si-input ${errors.password ? 'si-input-error' : ''}`}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => set('password')(e.target.value)}
                />
                <PasswordStrength password={form.password} />
                {errors.password && <span className="si-field-err">{errors.password}</span>}
              </div>
              <div className="si-field">
                <label className="si-label">Confirm Password *</label>
                <input
                  type="password"
                  className={`si-input ${errors.confirm ? 'si-input-error' : ''}`}
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={e => set('confirm')(e.target.value)}
                />
                {errors.confirm && <span className="si-field-err">{errors.confirm}</span>}
              </div>
            </div>

            <button type="submit" className="si-submit" disabled={loading}>
              {loading ? <><span className="si-spinner" />Creating account...</> : 'Create Account'}
            </button>
          </form>

          <p className="si-switch">
            Already have an account?{' '}
            <button className="si-link" onClick={onGoLogin}>Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
}
