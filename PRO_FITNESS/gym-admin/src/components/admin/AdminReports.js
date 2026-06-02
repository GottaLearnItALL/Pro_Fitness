import React, { useMemo } from 'react';
import IC from './icons';

export default function AdminReports({ users, sessions, memberships, plans, loading }) {
  const clients  = users.filter(u => u.role === 'client');
  const trainers = users.filter(u => u.role === 'trainer');

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const thisMonth = sessions.filter(s => new Date(s.scheduled_at) >= monthStart);

  const byStatus = useMemo(() => {
    const counts = { scheduled: 0, completed: 0, cancelled: 0, no_show: 0 };
    sessions.forEach(s => { if (counts[s.status] != null) counts[s.status]++; });
    return counts;
  }, [sessions]);

  // Trainer performance
  const trainerStats = useMemo(() => trainers.map(t => {
    const ts = sessions.filter(s => s.trainer_id === t.id);
    return {
      name: `${t.first_name} ${t.last_name}`,
      total: ts.length,
      completed: ts.filter(s => s.status === 'completed').length,
      upcoming: ts.filter(s => s.status === 'scheduled').length,
    };
  }).sort((a, b) => b.total - a.total).slice(0, 6), [trainers, sessions]);

  // Plan popularity
  const planStats = useMemo(() => plans.map(p => ({
    name: p.name,
    count: memberships.filter(m => m.plan_id === p.id).length,
  })).sort((a, b) => b.count - a.count), [plans, memberships]);

  const maxPlanCount = Math.max(1, ...planStats.map(p => p.count));

  const cards = [
    { kind: 'amber', label: 'Total Sessions',     value: sessions.length,        icon: IC.Activity },
    { kind: 'teal',  label: 'Completed',          value: byStatus.completed,     icon: IC.Check    },
    { kind: 'blue',  label: 'Sessions This Month', value: thisMonth.length,      icon: IC.Calendar },
    { kind: 'coral', label: 'Cancelled / No-Show', value: byStatus.cancelled + byStatus.no_show, icon: IC.X },
  ];

  return (
    <div className="ad-fade-in">
      <div className="ad-page-header">
        <div className="ad-page-titles">
          <div className="ad-page-title">Reports</div>
          <div className="ad-page-sub">Analytics and member insights</div>
        </div>
      </div>

      <div className="ad-stats-grid">
        {cards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`ad-stat-card ${s.kind}`}>
              <div className="ad-stat-icon"><Icon /></div>
              <div>
                <div className="ad-stat-value">{loading ? '…' : s.value}</div>
                <div className="ad-stat-label">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ad-two-col">
        {/* Trainer performance */}
        <div className="ad-card">
          <div className="ad-card-header">
            <div className="ad-section-title">Trainer Performance</div>
            <span className="ad-section-sub">{trainers.length} trainers</span>
          </div>
          {trainerStats.length === 0 ? (
            <div className="ad-empty">
              <div className="ad-empty-icon"><IC.Trainer /></div>
              <div className="ad-empty-text">No trainer data yet</div>
            </div>
          ) : (
            <table className="ad-table" style={{ borderRadius: 0 }}>
              <thead>
                <tr>
                  <th className="no-sort">Trainer</th>
                  <th className="no-sort">Total</th>
                  <th className="no-sort">Completed</th>
                  <th className="no-sort">Upcoming</th>
                </tr>
              </thead>
              <tbody>
                {trainerStats.map((t, i) => (
                  <tr key={i} style={{ cursor: 'default' }}>
                    <td><div className="ad-row-name">{t.name}</div></td>
                    <td><strong style={{ color: '#001427' }}>{t.total}</strong></td>
                    <td><span className="ad-badge ad-badge-completed">{t.completed}</span></td>
                    <td><span className="ad-badge ad-badge-scheduled">{t.upcoming}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Plan popularity */}
        <div className="ad-card">
          <div className="ad-card-header">
            <div className="ad-section-title">Plan Popularity</div>
            <span className="ad-section-sub">{memberships.length} memberships</span>
          </div>
          {planStats.length === 0 ? (
            <div className="ad-empty">
              <div className="ad-empty-icon"><IC.Membership /></div>
              <div className="ad-empty-text">No plans configured</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {planStats.map((p, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13.5 }}>
                    <span style={{ fontWeight: 600, color: 'var(--hk-charcoal)' }}>{p.name}</span>
                    <span style={{ color: 'var(--hk-text-muted)' }}>{p.count} {p.count === 1 ? 'member' : 'members'}</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(45, 90, 39, 0.08)', borderRadius: 999, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(p.count / maxPlanCount) * 100}%`,
                        background: 'linear-gradient(90deg, var(--hk-green), var(--hk-green-light))',
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Member breakdown */}
      <div className="ad-card">
        <div className="ad-card-header">
          <div className="ad-section-title">Member Roles</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          <div style={{ padding: '22px 26px', background: 'rgba(45, 90, 39, 0.06)', borderRadius: 16 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--hk-green)', letterSpacing: '-0.8px' }}>{clients.length}</div>
            <div style={{ fontSize: 14, color: 'var(--hk-text-muted)', fontWeight: 600, marginTop: 6 }}>CLIENTS</div>
          </div>
          <div style={{ padding: '22px 26px', background: 'rgba(74, 124, 63, 0.06)', borderRadius: 16 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--hk-green-light)', letterSpacing: '-0.8px' }}>{trainers.length}</div>
            <div style={{ fontSize: 14, color: 'var(--hk-text-muted)', fontWeight: 600, marginTop: 6 }}>TRAINERS</div>
          </div>
          <div style={{ padding: '22px 26px', background: 'rgba(30, 61, 26, 0.06)', borderRadius: 16 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--hk-green-dark)', letterSpacing: '-0.8px' }}>{memberships.filter(m => m.status === 'active' || !m.status).length}</div>
            <div style={{ fontSize: 14, color: 'var(--hk-text-muted)', fontWeight: 600, marginTop: 6 }}>ACTIVE MEMBERSHIPS</div>
          </div>
        </div>
      </div>
    </div>
  );
}
