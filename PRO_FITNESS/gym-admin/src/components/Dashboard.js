import React, { useEffect, useState, useCallback } from 'react';
import { getUsers, getSessions, getMemberships, getMembershipPlans, postAttendance, updateSession } from '../api';
import Modal from './Modal';
import { useBookingRefresh } from '../bookingEvent';
import { fmtDate as fmtDateTz } from '../timezone';

const STATUS_COLORS = {
  scheduled: { bg: 'rgba(212,175,135,0.15)', color: '#d4af87' },
  completed:  { bg: 'rgba(74,222,128,0.15)',  color: '#4ade80' },
  cancelled:  { bg: 'rgba(255,100,100,0.15)', color: '#ff6464' },
  no_show:    { bg: 'rgba(136,136,136,0.15)', color: '#888'    },
};

function AttendanceModal({ session, users, onClose, onSaved }) {
  const [attendanceStatus, setAttendanceStatus] = useState('present');
  const [sessionStatus,    setSessionStatus]    = useState(session.status || 'completed');
  const [notes,            setNotes]            = useState(session.notes || '');
  const [saving,           setSaving]           = useState(false);
  const [error,            setError]            = useState('');

  const client  = users.find(u => u.id === session.client_id);
  const trainer = users.find(u => u.id === session.trainer_id);

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await Promise.all([
        postAttendance({ session_id: session.id, user_id: session.client_id, role: 'client', check_in: new Date().toISOString().split('T')[0], status: attendanceStatus }),
        updateSession(session.id, { status: sessionStatus, notes }),
      ]);
      onSaved(); onClose();
    } catch { setError('Failed to save. Please try again.'); }
    finally   { setSaving(false); }
  };

  return (
    <Modal title={<><span>✓</span> Mark Attendance</>} onClose={onClose}
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save'}</button></>}>
      {error && <div className="error-banner">{error}</div>}
      <div style={{ padding:'14px 18px', background:'rgba(212,175,135,0.07)', borderRadius:10, border:'1px solid rgba(212,175,135,0.15)', marginBottom:20 }}>
        <div style={{ fontWeight:600, marginBottom:4 }}>{client ? `${client.first_name} ${client.last_name}` : `Client #${session.client_id}`}</div>
        <div style={{ fontSize:13, color:'#888' }}>with {trainer ? `${trainer.first_name} ${trainer.last_name}` : `Trainer #${session.trainer_id}`} · {fmtDateTz(session.scheduled_at, { month:'short', day:'numeric', year:'numeric' })}</div>
      </div>
      <div className="form-grid">
        <div className="form-group"><label className="form-label">Client Attendance</label><select className="form-select" value={attendanceStatus} onChange={e => setAttendanceStatus(e.target.value)}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option></select></div>
        <div className="form-group"><label className="form-label">Session Status</label><select className="form-select" value={sessionStatus} onChange={e => setSessionStatus(e.target.value)}><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No Show</option></select></div>
        <div className="form-group full-width"><label className="form-label">Session Notes</label><textarea className="form-input" placeholder="What was covered…" value={notes} onChange={e => setNotes(e.target.value)} rows={4} style={{ resize:'vertical', fontFamily:'var(--font-body)' }} /></div>
      </div>
    </Modal>
  );
}

export default function Dashboard({ setActiveTab }) {
  const [users,        setUsers]       = useState([]);
  const [sessions,     setSessions]    = useState([]);
  const [memberships,  setMemberships] = useState([]);
  const [plans,        setPlans]       = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [selectedSess, setSelected]    = useState(null);

  const fetchData = useCallback(() => {
    Promise.all([getUsers(), getSessions(), getMemberships(), getMembershipPlans()])
      .then(([uRes, sRes, mRes, pRes]) => {
        setUsers(uRes.data?.Data || []);
        const raw = sRes.data;
        setSessions(Array.isArray(raw?.Data) ? raw.Data : Array.isArray(raw) ? raw : []);
        setMemberships(mRes.data?.Data || []);
        setPlans(pRes.data?.Data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useBookingRefresh(fetchData);

  const clients  = users.filter(u => u.role === 'client');
  const trainers = users.filter(u => u.role === 'trainer');
  const getName  = id => { const u = users.find(u => u.id === id); return u ? `${u.first_name} ${u.last_name}` : `#${id}`; };

  // ── Computed metrics ──────────────────────────────────────────
  const todayStr = new Date().toDateString();
  const todaySessions = sessions.filter(s => new Date(s.scheduled_at).toDateString() === todayStr && s.status === 'scheduled');

  const activeMemberships = memberships.filter(m => m.status === 'active' || !m.status);
  const revenue = activeMemberships.reduce((sum, m) => {
    const plan = plans.find(p => p.id === m.plan_id);
    return sum + (plan?.price || 0);
  }, 0);

  const sevenDays = new Date(); sevenDays.setDate(sevenDays.getDate() + 7);
  const expiring  = memberships.filter(m => {
    if (!m.end_date) return false;
    const end = new Date(m.end_date);
    return end >= new Date() && end <= sevenDays;
  });

  const recentSignups = [...users].sort((a, b) => b.id - a.id).slice(0, 5);
  const recentSessions = [...sessions].sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)).slice(0, 5);

  const stats = [
    { label: 'Active Clients',    value: loading ? '…' : clients.length,        change: 'registered',       icon: '◎' },
    { label: 'Trainers on Staff', value: loading ? '…' : trainers.length,       change: 'active',           icon: '◉' },
    { label: 'Sessions Today',    value: loading ? '…' : todaySessions.length,  change: 'scheduled',        icon: '◷', highlight: todaySessions.length > 0 },
    { label: 'Est. Revenue',      value: loading ? '…' : `$${revenue.toLocaleString()}`, change: 'active memberships', icon: '◆' },
  ];

  const quickActions = [
    { label: 'Add New Client',             icon: '+',  tab: 'clients'  },
    { label: 'Schedule Session',           icon: '◷',  tab: 'schedule' },
    { label: 'Add Trainer',                icon: '◉',  tab: 'trainers' },
    { label: 'View Full Schedule',         icon: '◊',  tab: 'schedule' },
    { label: 'View Expiring Memberships',  icon: '⚠',  tab: null, action: () => {} },
    { label: 'Send Reminder',              icon: '✉',  tab: null, action: () => {} },
  ];

  return (
    <div className="fade-in">

      {/* ── Stats row ── */}
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className={`stat-card ${s.highlight ? 'stat-card-highlight' : ''}`}>
            <div className="stat-card-bg">{s.icon}</div>
            <span className="stat-label">{s.label}</span>
            <div className="stat-value">{s.value}</div>
            <span className="stat-change">{s.change}</span>
          </div>
        ))}
      </div>

      {/* ── Expiring memberships alert ── */}
      {!loading && expiring.length > 0 && (
        <div className="admin-alert-card">
          <div className="admin-alert-icon">⚠</div>
          <div className="admin-alert-body">
            <div className="admin-alert-title">{expiring.length} membership{expiring.length > 1 ? 's' : ''} expiring within 7 days</div>
            <div className="admin-alert-list">
              {expiring.map((m, i) => {
                const client = users.find(u => u.id === m.client_id);
                const plan   = plans.find(p => p.id === m.plan_id);
                return (
                  <span key={i} className="admin-alert-tag">
                    {client ? `${client.first_name} ${client.last_name}` : `Client #${m.client_id}`}
                    {plan ? ` · ${plan.name}` : ''} · expires {fmtDateTz(m.end_date, { month:'short', day:'numeric' })}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="dashboard-grid">

        {/* Recent sessions */}
        <div className="card">
          <h2 className="card-title"><span className="card-title-icon">◷</span>Recent Sessions</h2>
          {loading ? <div className="loading-state"><div className="spinner" /> Loading…</div>
          : recentSessions.length === 0 ? <div className="empty-state"><div className="empty-state-icon">◷</div><p>No sessions found</p></div>
          : (
            <div className="session-list">
              {recentSessions.map((s, i) => {
                const sc = STATUS_COLORS[s.status] || STATUS_COLORS.scheduled;
                return (
                  <div key={i} className="session-item">
                    <span className="session-time">{fmtDateTz(s.scheduled_at, { month:'short', day:'numeric' })}</span>
                    <div className="session-info">
                      <div className="session-client">{getName(s.client_id)}</div>
                      <div className="session-trainer">with {getName(s.trainer_id)}</div>
                      {s.notes && <div style={{ fontSize:12, color:'#888', marginTop:2, fontStyle:'italic' }}>{s.notes.length>60?s.notes.slice(0,60)+'…':s.notes}</div>}
                    </div>
                    <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:500, background:sc.bg, color:sc.color, whiteSpace:'nowrap' }}>{s.status}</span>
                    {s.status === 'scheduled' && <button className="btn btn-secondary btn-sm" onClick={() => setSelected(s)}>✓ Done</button>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card">
          <h2 className="card-title">Quick Actions</h2>
          <div className="quick-actions">
            {quickActions.map((a, i) => (
              <button key={i} className="action-btn" onClick={() => a.tab ? setActiveTab(a.tab) : a.action?.()}>
                <span className="action-btn-icon">{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent signups ── */}
      {!loading && recentSignups.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h2 className="card-title"><span className="card-title-icon">◎</span>Recent Signups</h2>
          <div className="session-list">
            {recentSignups.map((u, i) => (
              <div key={i} className="session-item">
                <div className="user-avatar" style={{ width:36, height:36, fontSize:14, borderRadius:10, flexShrink:0 }}>
                  {u.first_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="session-info">
                  <div className="session-client">{u.first_name} {u.last_name}</div>
                  <div className="session-trainer">{u.email}</div>
                </div>
                <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:500, background:'rgba(212,175,135,0.12)', color:'#d4af87' }}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedSess && <AttendanceModal session={selectedSess} users={users} onClose={() => setSelected(null)} onSaved={fetchData} />}
    </div>
  );
}
