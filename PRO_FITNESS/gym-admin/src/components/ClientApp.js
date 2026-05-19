import React, { useEffect, useState, useCallback } from 'react';
import { getSessions, getMyMembership, getMembershipPlansPublic, getTrainers } from '../api';
import { getUserId, getUserName } from '../auth';
import ProfileMenu from './ProfileMenu';
import Chatbot from './Chatbot';
import { useBookingRefresh } from '../bookingEvent';
import { openChatWith } from '../chatEvent';

const STATUS_COLORS = {
  scheduled: { bg: 'rgba(212,175,135,0.15)', color: '#d4af87' },
  completed:  { bg: 'rgba(74,222,128,0.15)',  color: '#4ade80' },
  cancelled:  { bg: 'rgba(255,100,100,0.15)', color: '#ff6464' },
  no_show:    { bg: 'rgba(136,136,136,0.15)', color: '#888'    },
};

function fmt(dateStr, opts) {
  return new Date(dateStr).toLocaleDateString([], opts);
}
function fmtTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ClientApp({ onLogout }) {
  const clientId  = getUserId();
  const firstName = getUserName();

  const [sessions,    setSessions]    = useState([]);
  const [membership,  setMembership]  = useState(null);
  const [plans,       setPlans]       = useState([]);
  const [trainers,    setTrainers]    = useState([]);
  const [loading,     setLoading]     = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, mRes, pRes, tRes] = await Promise.all([
        getSessions(),
        getMyMembership(),
        getMembershipPlansPublic(),
        getTrainers().catch(() => ({ data: { Data: [] } })),
      ]);
      setSessions((sRes.data?.Data || []).filter(s => s.client_id === clientId));
      setMembership((mRes.data?.Data || [])[0] || null);
      setPlans(pRes.data?.Data || []);
      setTrainers(tRes.data?.Data || []);
    } finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useBookingRefresh(fetchAll);

  const upcoming = [...sessions]
    .filter(s => s.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const history = [...sessions]
    .filter(s => s.status !== 'scheduled')
    .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));

  const plan       = membership ? plans.find(p => p.id === membership.plan_id) : null;
  const planName   = plan?.name || (membership ? `Plan #${membership.plan_id}` : 'No Plan');
  const trainerName = (id) => {
    const t = trainers.find(t => t.id === id);
    return t ? `${t.first_name} ${t.last_name}` : `Trainer #${id}`;
  };

  const expiryStr = membership?.end_date
    ? fmt(membership.end_date, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div className="app">
      <div className="texture-overlay" />

      {/* ── Header ── */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">H</div>
          <div className="logo-text"><h1>HAACHIKO FITNESS</h1><span>Member Portal</span></div>
        </div>
        <ProfileMenu onLogout={onLogout} />
      </header>

      <main className="main-content fade-in">

        {loading ? (
          <div className="loading-state"><div className="spinner" /> Loading…</div>
        ) : (
          <>
            {/* ── Hero card ── */}
            <div className="client-hero">
              <div className="client-hero-left">
                <div className="client-hero-greeting">Welcome back,</div>
                <div className="client-hero-name">{firstName || 'Member'}</div>
                <div className="client-hero-plan">{planName}</div>
              </div>
              <div className="client-hero-right">
                <div className="client-hero-stat">
                  <div className="client-hero-stat-value accent">
                    {membership?.sessions_remaining ?? '—'}
                  </div>
                  <div className="client-hero-stat-label">Sessions Remaining</div>
                </div>
                <div className="client-hero-divider" />
                <div className="client-hero-stat">
                  <div className="client-hero-stat-value">{expiryStr}</div>
                  <div className="client-hero-stat-label">Membership Expires</div>
                </div>
              </div>
            </div>

            {/* ── Two-column section ── */}
            <div className="client-two-col">

              {/* Left: upcoming sessions */}
              <div>
                <h3 className="client-section-title">
                  <span>◷</span> Upcoming Sessions
                  <span className="client-section-count">{upcoming.length}</span>
                </h3>

                {upcoming.length === 0 ? (
                  <div className="client-empty-col">
                    <div className="client-empty-icon">◷</div>
                    <p>No upcoming sessions</p>
                    <button
                      className="client-book-btn-small"
                      onClick={() => openChatWith('I want to book a session')}
                    >
                      Book one now
                    </button>
                  </div>
                ) : (
                  <div className="client-sessions-col">
                    {upcoming.map((s, i) => (
                      <div key={i} className="client-session-card">
                        <div className="client-session-card-left">
                          <div className="client-session-trainer">{trainerName(s.trainer_id)}</div>
                          <div className="client-session-date">
                            {fmt(s.scheduled_at, { weekday: 'short', month: 'short', day: 'numeric' })}
                            {' · '}
                            {fmtTime(s.scheduled_at)}
                          </div>
                          <div className="client-session-dur">{s.duration_min} min session</div>
                        </div>
                        <button
                          className="client-cancel-btn"
                          onClick={() => openChatWith(`Cancel my session with id ${s.id}`)}
                          title="Request cancellation via assistant"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: book a session */}
              <div>
                <h3 className="client-section-title"><span>✦</span> Book a Session</h3>
                <div className="client-book-card">
                  <div className="client-book-icon">◷</div>
                  <div className="client-book-heading">Ready for your next session?</div>
                  <div className="client-book-sub">
                    Our AI assistant will find the perfect trainer and time slot for you.
                  </div>
                  <button
                    className="client-book-btn"
                    onClick={() => openChatWith('I want to book a session')}
                  >
                    Book a Session
                  </button>
                  {membership && (
                    <div className="client-book-sessions-left">
                      {membership.sessions_remaining ?? 0} sessions available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Session History ── */}
            <div className="client-history-section">
              <h3 className="client-section-title"><span>◈</span> Session History</h3>
              {history.length === 0 ? (
                <div className="card">
                  <div className="empty-state">
                    <div className="empty-state-icon">◈</div>
                    <p>No past sessions yet</p>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="session-list" style={{ padding: '8px 0' }}>
                    {history.map((s, i) => {
                      const sc = STATUS_COLORS[s.status] || STATUS_COLORS.no_show;
                      return (
                        <div key={i} className="session-item">
                          <span className="session-time">
                            {fmt(s.scheduled_at, { month: 'short', day: 'numeric' })}
                          </span>
                          <div className="session-info">
                            <div className="session-client">{trainerName(s.trainer_id)}</div>
                            <div className="session-trainer">
                              {fmtTime(s.scheduled_at)} · {s.duration_min} min
                            </div>
                            {s.notes && (
                              <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 2 }}>
                                {s.notes.length > 60 ? s.notes.slice(0, 60) + '…' : s.notes}
                              </div>
                            )}
                          </div>
                          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>
                            {s.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <Chatbot />
    </div>
  );
}
