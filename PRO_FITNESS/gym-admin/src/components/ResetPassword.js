import React, { useState, useMemo } from 'react';
import axios from 'axios';

const BASE_URL = '/api';

export default function ResetPassword({ onGoLogin }) {
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get('token'),
    []
  );

  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || !confirm) {
      setError('Both fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/reset-password`, {
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Reset failed. The link may have expired — please request a new one.'
      );
    } finally {
      setLoading(false);
    }
  };

  const goLogin = () => {
    if (onGoLogin) {
      onGoLogin();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <button className="auth-back" onClick={goLogin}>← Back</button>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="landing-logo-icon">H</div>
          <div>
            <div className="landing-logo-name">HAACHIKO FITNESS</div>
            <div className="landing-logo-sub">Password Reset</div>
          </div>
        </div>

        {success ? (
          <>
            <div className="auth-reset-success">
              <span className="auth-reset-check">✓</span>
              <div>
                Your password has been reset successfully. You can now sign in
                with your new password.
              </div>
            </div>
            <button className="landing-btn-filled auth-submit" onClick={goLogin}>
              Go to Sign In
            </button>
          </>
        ) : (
          <>
            <h2 className="auth-title">Set new password</h2>
            <p className="auth-sub">Enter and confirm your new password below</p>

            {!token && (
              <div className="error-banner">
                No reset token found. Please use the link from your email.
              </div>
            )}

            {error && <div className="error-banner">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className={`form-input ${error && !password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className={`form-input ${error && password !== confirm ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                />
              </div>

              <button
                type="submit"
                className="landing-btn-filled auth-submit"
                disabled={loading || !token}
              >
                {loading ? (
                  <><span className="auth-spinner" />Resetting…</>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>

            <p className="auth-switch">
              Remembered your password?{' '}
              <button className="auth-link" onClick={goLogin}>Back to sign in</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
