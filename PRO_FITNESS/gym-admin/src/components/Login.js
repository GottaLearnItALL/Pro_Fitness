import React, { useState, useEffect } from 'react';
import { login as apiLogin, postFrogotPassword } from '../api';
import { setToken, setUserName, setTimezone, getRole } from '../auth';
import logo from '../assets/haachikologo.png';
import '../SignIn.css';

const FITNESS_QUOTES = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Strength does not come from the body. It comes from the will.", author: "Gandhi" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
  { text: "Your body can stand almost anything. It's your mind that you have to convince.", author: "Andrew Murphy" },
  { text: "Fitness is not about being better than someone else. It's about being better than you used to be.", author: "Khloe Kardashian" },
  { text: "The clock is ticking. Are you becoming the person you want to be?", author: "Greg Plitt" },
  { text: "Success is what comes after you stop making excuses.", author: "Luis Galarza" },
];

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

export default function Login({ onLoginSuccess, onGoRegister, onGoLanding }) {
  /* ── Quote rotation ── */
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [quoteFade, setQuoteFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteFade(false);
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % FITNESS_QUOTES.length);
        setQuoteFade(true);
      }, 600);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ── Shared state ── */
  const [loginTab, setLoginTab] = useState('password');   // 'password' | 'otp'
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);

  /* ── Password login ── */
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState({});

  /* ── Forgot password ── */
  const [mode, setMode]               = useState('login');  // 'login' | 'forgot'
  const [resetEmail, setResetEmail]   = useState('');
  const [resetError, setResetError]   = useState('');
  const [resetSent, setResetSent]     = useState(false);

  /* ── OTP login ── */
  const [otpPhoneCode, setOtpPhoneCode] = useState('+1');
  const [otpPhone, setOtpPhone]         = useState('');
  const [otpStep, setOtpStep]           = useState(1);     // 1 = enter phone, 2 = enter code
  const [otpCode, setOtpCode]           = useState('');
  const [otpError, setOtpError]         = useState('');
  const [devOtp, setDevOtp]             = useState('');     // shown in dev mode

  /* ── Forgot password handler ── */
  const handleReset = async (e) => {
    e.preventDefault();
    setResetError('');
    if (!resetEmail)                  { setResetError('Email is required.'); return; }
    if (!emailRegex.test(resetEmail)) { setResetError('Enter a valid email address.'); return; }
    try {
      await postFrogotPassword(resetEmail);
      setResetSent(true);
    } catch {
      setResetError('Something went wrong. Please try again.');
    }
    setResetSent(true);
  };

  const backToLogin = () => {
    setMode('login'); setResetSent(false); setResetError(''); setResetEmail('');
  };

  /* ── Password login handler ── */
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
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (first_name) setUserName(first_name);
      onLoginSuccess(getRole());
    } catch (err) {
      setApiError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── OTP handlers ── */
  const fullOtpPhone = otpPhoneCode + otpPhone;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    setDevOtp('');
    if (!otpPhone || otpPhone.replace(/\D/g, '').length < 6) {
      setOtpError('Please enter a valid phone number.');
      return;
    }
    setLoading(true);
    try {
      const raw = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullOtpPhone }),
      });
      const json = await raw.json();
      if (!raw.ok) throw new Error(json?.message || json?.detail || 'Failed to send OTP.');
      if (json?.dev_otp != null) setDevOtp(String(json.dev_otp));
      setOtpStep(2);
    } catch (err) {
      setOtpError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    if (!otpCode || otpCode.length < 6) {
      setOtpError('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const raw = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullOtpPhone, code: otpCode }),
      });
      const json = await raw.json();
      if (!raw.ok) throw new Error(json?.message || json?.detail || 'Verification failed.');
      if (!json?.token) { setOtpError('Verification failed.'); return; }
      setToken(json.token);
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (json.first_name) setUserName(json.first_name);
      onLoginSuccess(getRole());
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetOtp = () => {
    setOtpStep(1); setOtpCode(''); setOtpError(''); setDevOtp('');
  };

  /* ── Switch tabs — clear errors ── */
  const switchTab = (tab) => {
    setLoginTab(tab);
    setApiError('');
    setOtpError('');
    setErrors({});
  };

  const field = (name, label, type, placeholder, value, onChange) => (
    <div className="si-field">
      <label className="si-label">{label}</label>
      <input
        type={type}
        className={`si-input ${errors[name] ? 'si-input-error' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value); setErrors(p => ({ ...p, [name]: '' })); }}
      />
      {errors[name] && <span className="si-field-err">{errors[name]}</span>}
    </div>
  );

  return (
    <div className="si-page">
      {/* Left: branding panel with rotating quotes */}
      <div className="si-left">
        <div className="si-left-content si-left-quotes-layout">
          <div className="si-left-brand-top">
            <img src={logo} alt="Haachiko Fitness" className="si-left-logo" />
            <h1 className="si-left-title">HAACHIKO FITNESS</h1>
          </div>
          <div className={`si-quote-container ${quoteFade ? 'si-quote-visible' : 'si-quote-hidden'}`}>
            <p className="si-quote-text">"{FITNESS_QUOTES[quoteIdx].text}"</p>
            <span className="si-quote-author">— {FITNESS_QUOTES[quoteIdx].author}</span>
          </div>
          <p className="si-left-tagline">Where Fitness Meets Passion</p>
        </div>
        <div className="si-left-overlay" />
      </div>

      {/* Right: form */}
      <div className="si-right">
        <button className="si-back" onClick={onGoLanding}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </button>

        <div className="si-card">
          <div className="si-card-logo">
            <img src={logo} alt="Haachiko Fitness" className="si-card-logo-img" />
            <div>
              <div className="si-card-brand">HAACHIKO FITNESS</div>
              <div className="si-card-sub-brand">Member Portal</div>
            </div>
          </div>

          {mode === 'login' ? (
            <>
              <h2 className="si-title">Welcome back</h2>
              <p className="si-subtitle">Sign in to your dashboard</p>

              {/* ── Login method tabs ── */}
              <div className="si-tabs">
                <button
                  className={`si-tab ${loginTab === 'password' ? 'si-tab-active' : ''}`}
                  onClick={() => switchTab('password')}
                  type="button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Password
                </button>
                <button
                  className={`si-tab ${loginTab === 'otp' ? 'si-tab-active' : ''}`}
                  onClick={() => switchTab('otp')}
                  type="button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  Login with OTP
                </button>
              </div>

              {/* ── Password login form ── */}
              {loginTab === 'password' && (
                <>
                  {apiError && <div className="si-error-banner">{apiError}</div>}

                  <form className="si-form" onSubmit={handleSubmit} noValidate>
                    {field('email',    'Email Address', 'email',    'you@haachiko.com', email,    setEmail)}
                    {field('password', 'Password',      'password', '••••••••',         password, setPassword)}

                    <div className="si-forgot-row">
                      <button type="button" className="si-link" onClick={() => setMode('forgot')}>
                        Forgot password?
                      </button>
                    </div>

                    <button type="submit" className="si-submit" disabled={loading}>
                      {loading ? <><span className="si-spinner" />Signing in...</> : 'Sign In'}
                    </button>
                  </form>
                </>
              )}

              {/* ── OTP login form ── */}
              {loginTab === 'otp' && (
                <>
                  {otpError && <div className="si-error-banner">{otpError}</div>}

                  {otpStep === 1 ? (
                    <form className="si-form" onSubmit={handleSendOtp} noValidate>
                      <div className="si-field">
                        <label className="si-label">Phone Number</label>
                        <div className="si-phone-row">
                          <select
                            className="si-input si-phone-code"
                            value={otpPhoneCode}
                            onChange={e => setOtpPhoneCode(e.target.value)}
                          >
                            {COUNTRY_CODES.map(c => (
                              <option key={c.code} value={c.code}>{c.label}</option>
                            ))}
                          </select>
                          <input
                            type="tel"
                            className="si-input si-phone-number"
                            placeholder="5550001234"
                            value={otpPhone}
                            maxLength={15}
                            onChange={e => {
                              setOtpPhone(e.target.value.replace(/\D/g, '').slice(0, 15));
                              setOtpError('');
                            }}
                          />
                        </div>
                        <span className="si-field-hint">We'll send a one-time code to this number</span>
                      </div>

                      <button type="submit" className="si-submit" disabled={loading}>
                        {loading ? <><span className="si-spinner" />Sending code...</> : 'Send Code'}
                      </button>
                    </form>
                  ) : (
                    <form className="si-form" onSubmit={handleVerifyOtp} noValidate>
                      <div className="si-otp-sent-info">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        <span>Code sent to <strong>{fullOtpPhone}</strong></span>
                      </div>

                      {/* Dev OTP display */}
                      {devOtp && (
                        <div className="si-dev-otp">
                          <span className="si-dev-otp-label">DEV</span>
                          Your OTP code: <strong>{devOtp}</strong>
                        </div>
                      )}

                      <div className="si-field">
                        <label className="si-label">Verification Code</label>
                        <input
                          type="text"
                          className="si-input si-otp-input"
                          placeholder="000000"
                          value={otpCode}
                          maxLength={6}
                          autoFocus
                          onChange={e => {
                            setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                            setOtpError('');
                          }}
                        />
                      </div>

                      <button type="submit" className="si-submit" disabled={loading}>
                        {loading ? <><span className="si-spinner" />Verifying...</> : 'Verify & Sign In'}
                      </button>

                      <div className="si-otp-actions">
                        <button type="button" className="si-link" onClick={resetOtp}>
                          Change phone number
                        </button>
                        <button type="button" className="si-link" onClick={handleSendOtp} disabled={loading}>
                          Resend code
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              <p className="si-switch">
                Don't have an account?{' '}
                <button className="si-link" onClick={onGoRegister}>View plans &amp; register</button>
              </p>
            </>
          ) : (
            <>
              <h2 className="si-title">Reset your password</h2>
              <p className="si-subtitle">Enter your email and we'll send reset instructions</p>

              {resetSent ? (
                <>
                  <div className="si-reset-success">
                    <span className="si-reset-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                    <div>
                      If an account exists for <strong>{resetEmail}</strong>, you'll receive password
                      reset instructions shortly. Check your spam folder.
                    </div>
                  </div>
                  <button className="si-submit" onClick={backToLogin}>
                    Back to Sign In
                  </button>
                </>
              ) : (
                <form className="si-form" onSubmit={handleReset} noValidate>
                  <div className="si-field">
                    <label className="si-label">Email Address</label>
                    <input
                      type="email"
                      className={`si-input ${resetError ? 'si-input-error' : ''}`}
                      placeholder="you@haachiko.com"
                      value={resetEmail}
                      onChange={e => { setResetEmail(e.target.value); setResetError(''); }}
                    />
                    {resetError && <span className="si-field-err">{resetError}</span>}
                  </div>

                  <button type="submit" className="si-submit">
                    Send Reset Link
                  </button>
                </form>
              )}

              <p className="si-switch">
                Remembered it?{' '}
                <button className="si-link" onClick={backToLogin}>Back to sign in</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
