import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { getSessions, getMyMembership, getMembershipPlansPublic, getTrainers } from '../api';
import { getUserId, getUserName } from '../auth';
import { fmtDate, fmtTime } from '../timezone';
import Chatbot from './Chatbot';
import { useBookingRefresh } from '../bookingEvent';
import { openChatWith } from '../chatEvent';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import logo from '../assets/haachikologo.png';
import '../ClientApp.css';

/* ─── Inline SVG icons ─────────────────────────────────────── */
const IC = {
  Grid: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Award: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  LogOut: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Target: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  CalendarEmpty: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  BarChartIcon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6"  y1="20" x2="6"  y2="14"/>
    </svg>
  ),
  PieChartIcon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
      <path d="M22 12A10 10 0 0 0 12 2v10z"/>
    </svg>
  ),
};

/* ─── Helpers ───────────────────────────────────────────────── */
function initials(fullName) {
  if (!fullName) return '?';
  return fullName.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

/* ─── SVG Progress Ring Component ──────────────────────────── */
function ProgressRing({ used, total }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.min(1, used / total) : 0;
  const offset = circumference - pct * circumference;

  return (
    <div className="cd-ring-wrap">
      <svg className="cd-ring-svg" viewBox="0 0 150 150">
        <circle className="cd-ring-bg" cx="75" cy="75" r={radius} />
        <circle
          className="cd-ring-fill"
          cx="75" cy="75" r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="cd-ring-center">
        <div className="cd-ring-number">{total - used}</div>
        <div className="cd-ring-of">of {total}</div>
      </div>
    </div>
  );
}

/* ─── Constants ─────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',    Icon: IC.Grid     },
  { id: 'sessions',   label: 'My Sessions',  Icon: IC.Calendar },
  { id: 'membership', label: 'Membership',   Icon: IC.Award    },
  { id: 'profile',    label: 'Profile',      Icon: IC.User     },
];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PIE_COLORS = ['#2d5a27', '#ef4444', '#f59e0b', '#60a5fa'];

/* ─── Main component ────────────────────────────────────────── */
export default function ClientApp({ onLogout }) {
  const clientId  = getUserId();
  const firstName = getUserName();

  const [sessions,   setSessions]   = useState([]);
  const [membership, setMembership] = useState(null);
  const [plans,      setPlans]      = useState([]);
  const [trainers,   setTrainers]   = useState([]);
  const [loading,    setLoading]    = useState(true);

  const [activeNav,      setActiveNav]      = useState('dashboard');
  const [sessionsFilter, setSessionsFilter] = useState('all');

  /* ── Data fetching ────────────────────────────── */
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
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useBookingRefresh(fetchAll);

  /* ── Derived values ───────────────────────────── */
  const plan       = plans.find(p => p.id === membership?.plan_id);
  const planName   = plan?.name || (membership ? 'Active Plan' : 'No Plan');
  const expiryStr  = membership?.end_date
    ? fmtDate(membership.end_date, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  const trainerName = (id) => {
    const t = trainers.find(t => t.id === id);
    return t ? `${t.first_name} ${t.last_name}` : `Trainer #${id}`;
  };

  const upcoming = useMemo(() =>
    [...sessions]
      .filter(s => s.status === 'scheduled' && new Date(s.scheduled_at) > new Date())
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
      .slice(0, 5),
    [sessions]
  );

  const nextSession = upcoming[0] || null;

  const countdownText = useMemo(() => {
    if (!nextSession) return '';
    const diff = new Date(nextSession.scheduled_at) - new Date();
    if (diff < 0) return 'Starting now';
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `in ${Math.max(1, Math.floor(diff / 60000))} min`;
    if (hours < 24) return `in ${hours}h`;
    const days = Math.floor(hours / 24);
    return `in ${days} day${days !== 1 ? 's' : ''}`;
  }, [nextSession]);

  // Attendance data — last 6 months (for recharts)
  const attendanceData = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const count = sessions.filter(s => {
        const d = new Date(s.scheduled_at);
        return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
      }).length;
      months.push({ name: MONTH_LABELS[m.getMonth()], sessions: count });
    }
    return months;
  }, [sessions]);

  // Pie chart data (for recharts)
  const pieData = useMemo(() => {
    const completed = sessions.filter(s => s.status === 'completed').length;
    const cancelled = sessions.filter(s => s.status === 'cancelled').length;
    const noShow    = sessions.filter(s => s.status === 'no_show').length;
    const scheduled = sessions.filter(s => s.status === 'scheduled').length;
    return [
      { name: 'Completed', value: completed },
      { name: 'Cancelled', value: cancelled },
      { name: 'No Show',   value: noShow },
      { name: 'Scheduled', value: scheduled },
    ].filter(d => d.value > 0);
  }, [sessions]);

  // Session ring data
  const totalSessionsInPlan = plan?.session_limit ?? 0;
  const sessionsUsed = totalSessionsInPlan > 0
    ? totalSessionsInPlan - (membership?.sessions_remaining ?? 0)
    : 0;

  // Membership time progress
  const membershipTimePct = useMemo(() => {
    if (!membership?.start_date || !membership?.end_date) return 0;
    const start = new Date(membership.start_date).getTime();
    const end   = new Date(membership.end_date).getTime();
    const now   = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  }, [membership]);

  const memProgressColor = membershipTimePct < 50 ? 'green' : membershipTimePct < 80 ? 'orange' : 'red';

  // Sessions view
  const allSessionsSorted = useMemo(() =>
    [...sessions].sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)),
    [sessions]
  );
  const filteredMySessions = sessionsFilter === 'all'
    ? allSessionsSorted
    : allSessionsSorted.filter(s => s.status === sessionsFilter);

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="cd-layout">
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="cd-loading">
            <div className="cd-spinner" />
            <span>Loading your dashboard...</span>
          </div>
        </div>
        <Chatbot />
      </div>
    );
  }

  /* ─────────────────────────────────────────────────
     VIEW: Dashboard
  ───────────────────────────────────────────────── */
  const renderDashboard = () => (
    <>
      {/* Hero Banner */}
      <div className="cd-hero-banner">
        <div className="cd-hero-content">
          <div className="cd-hero-left">
            <div className="cd-hero-greeting">Welcome back, {firstName || 'Member'}</div>
            <div className="cd-hero-subtitle">
              {fmtDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="cd-hero-plan-badge">{planName}</div>
          </div>
          <div className="cd-hero-right">
            <div className="cd-hero-metric">
              <div className="cd-hero-metric-value">{membership?.sessions_remaining ?? '—'}</div>
              <div className="cd-hero-metric-label">Sessions Left</div>
            </div>
            <div className="cd-hero-metric">
              <div className="cd-hero-metric-value">{sessions.filter(s => s.status === 'completed').length}</div>
              <div className="cd-hero-metric-label">Completed</div>
            </div>
            <button
              className="cd-hero-book-btn"
              onClick={() => openChatWith('I want to book a session')}
            >
              <IC.Calendar /> Book a Session
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="cd-bento">
        {/* Row: Three widget cards */}
        <div className="cd-bento-row three">
          {/* Sessions Progress Ring */}
          <div className="cd-widget">
            <div className="cd-widget-header">
              <div className="cd-widget-title"><IC.Target /> Sessions Progress</div>
            </div>
            <div className="cd-ring-container">
              {totalSessionsInPlan > 0 ? (
                <>
                  <ProgressRing used={sessionsUsed} total={totalSessionsInPlan} />
                  <div className="cd-ring-label">Sessions Remaining</div>
                </>
              ) : (
                <div className="cd-empty-state" style={{ padding: '20px 0' }}>
                  <div className="cd-ring-number" style={{ fontSize: 48, marginBottom: 8 }}>
                    {membership?.sessions_remaining ?? '—'}
                  </div>
                  <div className="cd-ring-label">Unlimited Plan</div>
                </div>
              )}
            </div>
          </div>

          {/* Membership Card */}
          <div className="cd-widget">
            <div className="cd-widget-header">
              <div className="cd-widget-title"><IC.Award /> Membership</div>
              <div className="cd-widget-badge">{membership?.status || 'N/A'}</div>
            </div>
            <div className="cd-mem-plan-name">{planName}</div>
            <div className="cd-mem-dates">
              <div className="cd-mem-date-row">
                <span className="cd-mem-date-label">Start</span>
                <span className="cd-mem-date-value">
                  {membership?.start_date
                    ? fmtDate(membership.start_date, { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </span>
              </div>
              <div className="cd-mem-date-row">
                <span className="cd-mem-date-label">Expires</span>
                <span className="cd-mem-date-value">{expiryStr}</span>
              </div>
            </div>
            <div className="cd-mem-progress-track">
              <div className={`cd-mem-progress-fill ${memProgressColor}`} style={{ width: `${membershipTimePct}%` }} />
            </div>
            <div className="cd-mem-progress-text">{membershipTimePct}% elapsed</div>
          </div>

          {/* Next Session Card */}
          <div className="cd-widget">
            <div className="cd-widget-header">
              <div className="cd-widget-title"><IC.Clock /> Next Session</div>
            </div>
            {nextSession ? (
              <div className="cd-next-session-content">
                <div className="cd-next-trainer-avatar">
                  {initials(trainerName(nextSession.trainer_id))}
                </div>
                <div className="cd-next-trainer-name">{trainerName(nextSession.trainer_id)}</div>
                <div className="cd-next-datetime">
                  {fmtDate(nextSession.scheduled_at, { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' at '}
                  {fmtTime(nextSession.scheduled_at)}
                </div>
                <div className="cd-next-countdown">
                  <IC.Clock />
                  {countdownText}
                </div>
              </div>
            ) : (
              <div className="cd-empty-state">
                <div className="cd-empty-icon"><IC.CalendarEmpty /></div>
                <div className="cd-empty-text">No upcoming sessions</div>
                <button className="cd-book-now-btn" onClick={() => openChatWith('I want to book a session')}>
                  Book Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Row: Two chart cards */}
        <div className="cd-bento-row two">
          {/* Attendance Bar Chart (Recharts) */}
          <div className="cd-widget">
            <div className="cd-widget-header">
              <div className="cd-widget-title"><IC.BarChartIcon /> Monthly Activity</div>
              <div className="cd-widget-badge">Last 6 months</div>
            </div>
            <div className="cd-chart-container">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}
                    cursor={{ fill: 'rgba(45, 90, 39, 0.05)' }}
                  />
                  <Bar dataKey="sessions" fill="#2d5a27" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Session Breakdown Pie Chart (Recharts) */}
          <div className="cd-widget">
            <div className="cd-widget-header">
              <div className="cd-widget-title"><IC.PieChartIcon /> Session Breakdown</div>
            </div>
            <div className="cd-chart-container cd-pie-layout">
              {pieData.length === 0 ? (
                <div className="cd-empty-state">
                  <div className="cd-empty-text">No session data yet</div>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width={190} height={190}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="cd-pie-legend">
                    {pieData.map((d, i) => (
                      <div className="cd-legend-item" key={d.name}>
                        <div className="cd-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="cd-legend-label">{d.name}</span>
                        <span className="cd-legend-count">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row: Upcoming Sessions Table */}
        <div className="cd-bento-row full">
          <div className="cd-widget">
            <div className="cd-widget-header">
              <div className="cd-widget-title">
                <IC.Calendar /> Upcoming Sessions
                <span className="cd-section-count">{upcoming.length}</span>
              </div>
            </div>

            {upcoming.length === 0 ? (
              <div className="cd-empty-state">
                <div className="cd-empty-icon"><IC.CalendarEmpty /></div>
                <div className="cd-empty-text">No upcoming sessions scheduled</div>
                <button className="cd-btn-primary" onClick={() => openChatWith('I want to book a session')}>
                  Book a Session
                </button>
              </div>
            ) : (
              <div className="cd-table-wrap">
                <table className="cd-upcoming-table">
                  <thead>
                    <tr>
                      <th>Trainer</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div className="cd-table-trainer">
                            <div className="cd-table-avatar">{initials(trainerName(s.trainer_id))}</div>
                            <span className="cd-table-name">{trainerName(s.trainer_id)}</span>
                          </div>
                        </td>
                        <td>{fmtDate(s.scheduled_at, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                        <td>{fmtTime(s.scheduled_at)}</td>
                        <td><span className="cd-table-duration">{s.duration_min} min</span></td>
                        <td><span className="cd-table-status scheduled">Scheduled</span></td>
                        <td>
                          <button
                            className="cd-cancel-btn"
                            onClick={() => openChatWith(`Cancel my session with id ${s.id}`)}
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  /* ─────────────────────────────────────────────────
     VIEW: My Sessions
  ───────────────────────────────────────────────── */
  const renderSessions = () => {
    const totalCount     = sessions.length;
    const scheduledCount = sessions.filter(s => s.status === 'scheduled').length;
    const completedCount = sessions.filter(s => s.status === 'completed').length;
    const cancelledCount = sessions.filter(s => s.status === 'cancelled').length;
    return (
    <>
      <div className="cd-page-header">
        <div className="cd-page-title">My Sessions</div>
        <div className="cd-page-sub">All your training sessions in one place</div>
      </div>

      <div className="cd-section">
        <div className="cd-sessions-summary">
          <div className="cd-sessions-mini-card">
            <div className="cd-sessions-mini-icon blue"><IC.Calendar /></div>
            <div>
              <div className="cd-sessions-mini-num">{totalCount}</div>
              <div className="cd-sessions-mini-label">Total</div>
            </div>
          </div>
          <div className="cd-sessions-mini-card">
            <div className="cd-sessions-mini-icon amber"><IC.Clock /></div>
            <div>
              <div className="cd-sessions-mini-num">{scheduledCount}</div>
              <div className="cd-sessions-mini-label">Scheduled</div>
            </div>
          </div>
          <div className="cd-sessions-mini-card">
            <div className="cd-sessions-mini-icon green"><IC.Award /></div>
            <div>
              <div className="cd-sessions-mini-num">{completedCount}</div>
              <div className="cd-sessions-mini-label">Completed</div>
            </div>
          </div>
          <div className="cd-sessions-mini-card">
            <div className="cd-sessions-mini-icon red"><IC.X /></div>
            <div>
              <div className="cd-sessions-mini-num">{cancelledCount}</div>
              <div className="cd-sessions-mini-label">Cancelled</div>
            </div>
          </div>
        </div>

        <div className="cd-sessions-filter-bar">
          {['all', 'scheduled', 'completed', 'cancelled', 'no_show'].map(f => (
            <button
              key={f}
              className={`cd-filter-chip${sessionsFilter === f ? ' active' : ''}`}
              onClick={() => setSessionsFilter(f)}
            >
              {f === 'no_show' ? 'No Show' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="cd-widget">
          {filteredMySessions.length === 0 ? (
            <div className="cd-empty-state" style={{ padding: 40 }}>
              <div className="cd-empty-icon"><IC.CalendarEmpty /></div>
              <div className="cd-empty-text">No sessions match this filter</div>
            </div>
          ) : (
            <div className="cd-table-wrap">
              <table className="cd-upcoming-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Trainer</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMySessions.map((s) => (
                    <tr key={s.id}>
                      <td>{fmtDate(s.scheduled_at, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td>{fmtTime(s.scheduled_at)}</td>
                      <td>
                        <div className="cd-table-trainer">
                          <div className="cd-table-avatar">{initials(trainerName(s.trainer_id))}</div>
                          <span className="cd-table-name">{trainerName(s.trainer_id)}</span>
                        </div>
                      </td>
                      <td>{s.duration_min} min</td>
                      <td>
                        <span className={`cd-table-status ${s.status}`}>{s.status.replace('_', ' ')}</span>
                      </td>
                      <td>
                        {s.status === 'scheduled' && (
                          <button className="cd-cancel-btn" onClick={() => openChatWith(`Cancel my session with id ${s.id}`)}>
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
    );
  };

  /* ─────────────────────────────────────────────────
     VIEW: Membership
  ───────────────────────────────────────────────── */
  const renderMembership = () => {
    const totalSessions = plan?.session_limit ?? 0;
    const remaining     = membership?.sessions_remaining ?? 0;
    const used          = totalSessions > 0 ? totalSessions - remaining : 0;
    const usedPct       = totalSessions > 0 ? Math.min(100, (used / totalSessions) * 100) : 0;
    const completedCnt  = sessions.filter(s => s.status === 'completed').length;
    const upcomingCnt   = sessions.filter(s => s.status === 'scheduled').length;
    const now = new Date();
    const sessionsThisMonth = sessions.filter(s => {
      const d = new Date(s.scheduled_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return (
    <>
      <div className="cd-page-header">
        <div className="cd-page-title">Membership</div>
        <div className="cd-page-sub">Your current plan, usage and renewal details</div>
      </div>

      <div className="cd-section">
        {!membership ? (
          <div className="cd-widget" style={{ maxWidth: 520 }}>
            <div className="cd-empty-state">
              <div className="cd-empty-icon"><IC.Award /></div>
              <div className="cd-empty-text">No active membership found</div>
              <button className="cd-btn-primary" onClick={() => openChatWith('I want to get a membership plan')}>
                Get a Plan
              </button>
            </div>
          </div>
        ) : (
          <div className="cd-membership-grid">
            <div className="cd-membership-hero">
              <div className="cd-membership-tier">Current Plan</div>
              <div className="cd-membership-plan-name">{planName}</div>
              <div className="cd-membership-status-badge">{membership.status}</div>
              <div className="cd-membership-divider" />
              <div className="cd-membership-detail">
                <span className="cd-membership-detail-label">Start Date</span>
                <span className="cd-membership-detail-value">
                  {fmtDate(membership.start_date, { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="cd-membership-detail">
                <span className="cd-membership-detail-label">Expiry Date</span>
                <span className="cd-membership-detail-value">{expiryStr}</span>
              </div>
              {plan && (
                <>
                  <div className="cd-membership-detail">
                    <span className="cd-membership-detail-label">Plan Duration</span>
                    <span className="cd-membership-detail-value">{plan.duration_days} days</span>
                  </div>
                  <div className="cd-membership-detail">
                    <span className="cd-membership-detail-label">Session Limit</span>
                    <span className="cd-membership-detail-value">{plan.session_limit ?? 'Unlimited'}</span>
                  </div>
                  <div className="cd-membership-detail">
                    <span className="cd-membership-detail-label">Plan Price</span>
                    <span className="cd-membership-detail-value">${plan.price}</span>
                  </div>
                </>
              )}
            </div>

            <div className="cd-membership-progress-card">
              <div className="cd-progress-label">Sessions Remaining</div>
              <div className="cd-progress-headline">
                <span className="cd-progress-num">{remaining}</span>
                <span className="cd-progress-total">{totalSessions > 0 ? `/ ${totalSessions}` : ''}</span>
              </div>
              <div className="cd-progress-sub">
                {totalSessions > 0
                  ? `You've used ${used} of ${totalSessions} sessions this cycle`
                  : 'Unlimited sessions on your plan'}
              </div>
              <div className="cd-progress-track">
                <div className="cd-progress-fill" style={{ width: `${totalSessions > 0 ? usedPct : 100}%` }} />
              </div>
              <div className="cd-progress-mini-grid">
                <div className="cd-progress-mini">
                  <div className="cd-progress-mini-num">{sessionsThisMonth}</div>
                  <div className="cd-progress-mini-label">This Month</div>
                </div>
                <div className="cd-progress-mini">
                  <div className="cd-progress-mini-num">{completedCnt}</div>
                  <div className="cd-progress-mini-label">Completed</div>
                </div>
                <div className="cd-progress-mini">
                  <div className="cd-progress-mini-num">{upcomingCnt}</div>
                  <div className="cd-progress-mini-label">Upcoming</div>
                </div>
                <div className="cd-progress-mini">
                  <div className="cd-progress-mini-num">{sessions.filter(s => s.status === 'cancelled').length}</div>
                  <div className="cd-progress-mini-label">Cancelled</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Available Plans */}
      {plans.length > 0 && (
        <div className="cd-section">
          <h3 className="cd-available-plans-title">Available Plans</h3>
          <div className="cd-plans-grid">
            {plans.map(p => (
              <div key={p.id} className={`cd-plan-card${p.id === membership?.plan_id ? ' current' : ''}`}>
                {p.id === membership?.plan_id && <div className="cd-plan-current-badge">Current</div>}
                <div className="cd-plan-name">{p.name}</div>
                <div className="cd-plan-price">${p.price}<span>/plan</span></div>
                <div className="cd-plan-details">
                  <div className="cd-plan-detail">{p.duration_days} days</div>
                  <div className="cd-plan-detail">{p.session_limit ? `${p.session_limit} sessions` : 'Unlimited'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
    );
  };

  /* ─────────────────────────────────────────────────
     VIEW: Profile
  ───────────────────────────────────────────────── */
  const renderProfile = () => {
    const completedCnt = sessions.filter(s => s.status === 'completed').length;
    const now = new Date();
    const sessionsThisMonth = sessions.filter(s => {
      const d = new Date(s.scheduled_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return (
    <>
      <div className="cd-page-header">
        <div className="cd-page-title">Profile</div>
        <div className="cd-page-sub">Your account information and activity</div>
      </div>

      <div className="cd-section">
        <div className="cd-profile-hero">
          <div className="cd-profile-avatar-lg">
            {firstName ? firstName[0].toUpperCase() : 'U'}
          </div>
          <div className="cd-profile-hero-info">
            <div className="cd-profile-name">{firstName || 'Member'}</div>
            <div className="cd-profile-role">Client &middot; Haachiko Fitness Member</div>
            <div className="cd-profile-hero-badges">
              <span className="cd-profile-hero-badge"><IC.Award /> {planName}</span>
              {membership && (
                <span className="cd-profile-hero-badge"><IC.Shield /> {membership.status}</span>
              )}
            </div>
          </div>
        </div>

        <div className="cd-profile-grid">
          <div className="cd-profile-card">
            <h3 className="cd-profile-card-title">Account Details</h3>
            <div className="cd-profile-row">
              <span className="cd-profile-row-label">Full Name</span>
              <span className="cd-profile-row-value">{firstName || 'Member'}</span>
            </div>
            <div className="cd-profile-row">
              <span className="cd-profile-row-label">Role</span>
              <span className="cd-profile-row-value">Client</span>
            </div>
            <div className="cd-profile-row">
              <span className="cd-profile-row-label">Member ID</span>
              <span className="cd-profile-row-value">#{clientId}</span>
            </div>
            <div className="cd-profile-row">
              <span className="cd-profile-row-label">Member Since</span>
              <span className="cd-profile-row-value">
                {membership?.start_date
                  ? fmtDate(membership.start_date, { month: 'long', year: 'numeric' })
                  : '—'}
              </span>
            </div>
          </div>

          <div className="cd-profile-card">
            <h3 className="cd-profile-card-title">Activity Summary</h3>
          <div className="cd-profile-row">
            <span className="cd-profile-row-label">Current Plan</span>
            <span className="cd-profile-row-value">{planName}</span>
          </div>
          <div className="cd-profile-row">
            <span className="cd-profile-row-label">Sessions Remaining</span>
            <span className="cd-profile-row-value">{membership?.sessions_remaining ?? 'Unlimited'}</span>
          </div>
          <div className="cd-profile-row">
            <span className="cd-profile-row-label">Sessions Completed</span>
            <span className="cd-profile-row-value">{completedCnt}</span>
          </div>
          <div className="cd-profile-row">
            <span className="cd-profile-row-label">Sessions This Month</span>
            <span className="cd-profile-row-value">{sessionsThisMonth}</span>
          </div>
          <div className="cd-profile-row">
            <span className="cd-profile-row-label">Total Sessions</span>
            <span className="cd-profile-row-value">{sessions.length}</span>
          </div>
        </div>
        </div>
      </div>
    </>
    );
  };

  /* ─────────────────────────────────────────────────
     Root render
  ───────────────────────────────────────────────── */
  return (
    <div className="cd-layout">
      {/* Sidebar */}
      <aside className="cd-sidebar">
        <div className="cd-sidebar-logo">
          <img src={logo} alt="Haachiko Fitness" className="cd-sidebar-logo-img" />
          <span className="cd-sidebar-brand">HAACHIKO</span>
        </div>

        <nav className="cd-sidebar-nav">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`cd-nav-item${activeNav === id ? ' active' : ''}`}
              onClick={() => setActiveNav(id)}
            >
              <Icon />
              <span className="cd-nav-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="cd-sidebar-footer">
          <div className="cd-user-card">
            <div className="cd-user-avatar">
              {firstName ? firstName[0].toUpperCase() : 'U'}
            </div>
            <div className="cd-user-info">
              <div className="cd-user-name">{firstName || 'Member'}</div>
              <div className="cd-user-role">Client</div>
            </div>
          </div>
          <button className="cd-logout-btn" onClick={onLogout} title="Sign Out">
            <IC.LogOut />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="cd-main">
        <div className="cd-main-inner">
          {activeNav === 'dashboard'  && renderDashboard()}
          {activeNav === 'sessions'   && renderSessions()}
          {activeNav === 'membership' && renderMembership()}
          {activeNav === 'profile'    && renderProfile()}
        </div>
      </main>

      <Chatbot />
    </div>
  );
}
