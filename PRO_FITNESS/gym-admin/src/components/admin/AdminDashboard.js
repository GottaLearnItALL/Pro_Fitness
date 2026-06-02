import React, { useMemo } from 'react';
import IC from './icons';
import { updateSession } from '../../api';
import { fmtDate, fmtTime } from '../../timezone';

export default function AdminDashboard({
  users, sessions, memberships, plans, loading, refresh, setActiveView,
}) {
  const clients  = useMemo(() => users.filter(u => u.role === 'client'),  [users]);
  const trainers = useMemo(() => users.filter(u => u.role === 'trainer'), [users]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStr   = now.toDateString();

  const sessionsThisMonth = sessions.filter(s => s.scheduled_at && new Date(s.scheduled_at) >= monthStart).length;
  const sessionsToday     = sessions.filter(s => s.scheduled_at && new Date(s.scheduled_at).toDateString() === todayStr && s.status === 'scheduled').length;

  const sevenDays = new Date(); sevenDays.setDate(sevenDays.getDate() + 7);
  const expiring  = memberships.filter(m => {
    if (!m.end_date) return false;
    const end = new Date(m.end_date);
    return end >= now && end <= sevenDays;
  });

  const recentSessions = useMemo(
    () => [...sessions]
      .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
      .slice(0, 25),
    [sessions]
  );

  const getUser = (id) => users.find(u => u.id === id);
  const getName = (id) => { const u = getUser(id); return u ? `${u.first_name} ${u.last_name}` : `#${id}`; };
  const getPlanName = (mId) => {
    const m = memberships.find(x => x.id === mId);
    if (!m) return '—';
    const p = plans.find(p => p.id === m.plan_id);
    return p?.name || '—';
  };

  const markDone = async (sess) => {
    try { await updateSession(sess.id, { status: 'completed' }); refresh(); }
    catch { alert('Failed to mark session as done.'); }
  };

  const stats = [
    { kind: 'amber', label: 'Active Clients',      value: clients.length,     icon: IC.Users,     trend: 'registered' },
    { kind: 'teal',  label: 'Total Trainers',      value: trainers.length,    icon: IC.Trainer,   trend: 'on staff'    },
    { kind: 'blue',  label: 'Sessions This Month', value: sessionsThisMonth,  icon: IC.Activity,  trend: `${sessionsToday} today` },
    { kind: 'coral', label: 'Sessions Today',      value: sessionsToday,      icon: IC.Clock,     trend: 'scheduled' },
  ];

  const quickActions = [
    { label: 'Add Client',       sub: 'Register a new member',           icon: IC.Users,    onClick: () => setActiveView('clients') },
    { label: 'Add Trainer',      sub: 'Onboard a new trainer',           icon: IC.Trainer,  onClick: () => setActiveView('trainers') },
    { label: 'Schedule Session', sub: 'Book a new training session',     icon: IC.Calendar, onClick: () => setActiveView('schedule') },
    { label: 'View Reports',     sub: 'Analytics and member insights',   icon: IC.Reports,  onClick: () => setActiveView('reports') },
  ];

  return (
    <div className="ad-fade-in">
      <div className="ad-page-header">
        <div className="ad-page-titles">
          <div className="ad-page-title">Dashboard</div>
          <div className="ad-page-sub">Overview of your gym operations and member activity</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="ad-stats-grid">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`ad-stat-card ${s.kind}`}>
              <div className="ad-stat-icon"><Icon /></div>
              <div>
                <div className="ad-stat-value">{loading ? '…' : s.value}</div>
                <div className="ad-stat-label">{s.label}</div>
                <div className="ad-stat-trend"><IC.TrendUp /> {s.trend}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expiring alert */}
      {!loading && expiring.length > 0 && (
        <div className="ad-alert">
          <div className="ad-alert-icon"><IC.AlertTriangle /></div>
          <div className="ad-alert-body">
            <div className="ad-alert-title">
              {expiring.length} membership{expiring.length > 1 ? 's' : ''} expiring within 7 days
            </div>
            <div className="ad-alert-tags">
              {expiring.slice(0, 8).map((m, i) => {
                const plan = plans.find(p => p.id === m.plan_id);
                return (
                  <span key={i} className="ad-alert-tag">
                    {getName(m.client_id)}
                    {plan ? ` · ${plan.name}` : ''}
                    {' · expires '}
                    {fmtDate(m.end_date)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Two-column main */}
      <div className="ad-two-col">
        {/* Recent sessions */}
        <div className="ad-card">
          <div className="ad-card-header">
            <div className="ad-section-title">Recent Sessions</div>
            <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setActiveView('schedule')}>
              View all
            </button>
          </div>
          {loading ? (
            <div className="ad-loading"><span className="ad-spinner" /> Loading…</div>
          ) : recentSessions.length === 0 ? (
            <div className="ad-empty">
              <div className="ad-empty-icon"><IC.Calendar /></div>
              <div className="ad-empty-text">No sessions yet</div>
            </div>
          ) : (
            <div className="ad-session-list">
              {recentSessions.map(s => (
                <div key={s.id} className="ad-session-row">
                  <div className="ad-session-date">
                    <span className="ad-session-day">{fmtDate(s.scheduled_at)}</span>
                    <span className="ad-session-clock">{fmtTime(s.scheduled_at)}</span>
                  </div>
                  <div className="ad-session-body">
                    <div className="ad-session-client">{getName(s.client_id)}</div>
                    <div className="ad-session-trainer">with {getName(s.trainer_id)}</div>
                  </div>
                  <span className={`ad-badge ad-badge-${s.status || 'scheduled'}`}>{s.status || 'scheduled'}</span>
                  {s.status === 'scheduled' && (
                    <button className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => markDone(s)}>
                      <IC.Check /> Mark Done
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="ad-card">
          <div className="ad-card-header">
            <div className="ad-section-title">Quick Actions</div>
          </div>
          <div className="ad-quick-actions">
            {quickActions.map((a, i) => {
              const Icon = a.icon;
              return (
                <button key={i} className="ad-quick-action" onClick={a.onClick}>
                  <div className="ad-quick-action-icon"><Icon /></div>
                  <div className="ad-quick-action-text">
                    <div className="ad-quick-action-title">{a.label}</div>
                    <div className="ad-quick-action-sub">{a.sub}</div>
                  </div>
                  <div className="ad-quick-action-arrow"><IC.ChevronRight /></div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expiring memberships list card */}
      {!loading && expiring.length > 0 && (
        <div className="ad-card ad-card-flush" style={{ overflow: 'hidden' }}>
          <div className="ad-card-header" style={{ padding: '24px 28px 0', marginBottom: 12 }}>
            <div className="ad-section-title">Expiring Memberships</div>
            <span className="ad-section-sub">{expiring.length} total</span>
          </div>
          <table className="ad-table">
            <thead>
              <tr>
                <th className="no-sort">Client</th>
                <th className="no-sort">Plan</th>
                <th className="no-sort">Expires</th>
                <th className="no-sort">Sessions Left</th>
              </tr>
            </thead>
            <tbody>
              {expiring.map(m => {
                const u = getUser(m.client_id);
                const plan = plans.find(p => p.id === m.plan_id);
                const initials = u ? `${(u.first_name||'?')[0]}${(u.last_name||'?')[0]}`.toUpperCase() : '?';
                return (
                  <tr key={m.id} style={{ cursor: 'default' }}>
                    <td>
                      <div className="ad-row-user">
                        <div className="ad-row-avatar amber">{initials}</div>
                        <div className="ad-row-name">{getName(m.client_id)}</div>
                      </div>
                    </td>
                    <td>{plan?.name || '—'}</td>
                    <td><span className="ad-badge ad-badge-scheduled">{fmtDate(m.end_date, { month: 'short', day: 'numeric', year: 'numeric' })}</span></td>
                    <td>{m.sessions_remaining ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* unused getPlanName silenced */}
          {false && getPlanName(0)}
        </div>
      )}
    </div>
  );
}
