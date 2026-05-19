import React, { useEffect, useState, useCallback } from 'react';
import { getSessions, getUsers, getTrainerAvailability, addTrainerAvailability, postAttendance, updateSession } from '../api';
import { getUserId, getUserName } from '../auth';
import Modal from './Modal';
import Chatbot from './Chatbot';
import ProfileMenu from './ProfileMenu';
import { useBookingRefresh } from '../bookingEvent';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const STATUS_COLORS = {
  scheduled: { bg: 'rgba(212,175,135,0.15)', color: '#d4af87' },
  completed:  { bg: 'rgba(74,222,128,0.15)',  color: '#4ade80' },
  cancelled:  { bg: 'rgba(255,100,100,0.15)', color: '#ff6464' },
  no_show:    { bg: 'rgba(136,136,136,0.15)', color: '#888'    },
};

function fmtDate(d) { return new Date(d).toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' }); }
function fmtTime(d) { return new Date(d).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }

function AttendanceModal({ session, users, onClose, onSaved }) {
  const [attStatus,  setAtt]   = useState('present');
  const [sessStatus, setSess]  = useState('completed');
  const [notes,      setNotes] = useState(session.notes || '');
  const [saving,     setSaving] = useState(false);
  const client = users.find(u => u.id === session.client_id);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        postAttendance({ session_id: session.id, user_id: session.client_id, role: 'client', check_in: new Date().toISOString().split('T')[0], status: attStatus }),
        updateSession(session.id, { status: sessStatus, notes }),
      ]);
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal title={<><span>✓</span> Mark Attendance</>} onClose={onClose}
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <div style={{ padding:'12px 16px', background:'rgba(212,175,135,0.07)', borderRadius:10, border:'1px solid rgba(212,175,135,0.15)', marginBottom:20 }}>
        <div style={{ fontWeight:600 }}>{client ? `${client.first_name} ${client.last_name}` : `Client #${session.client_id}`}</div>
        <div style={{ fontSize:13, color:'#888' }}>{fmtDate(session.scheduled_at)} · {fmtTime(session.scheduled_at)}</div>
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Attendance</label>
          <select className="form-select" value={attStatus} onChange={e => setAtt(e.target.value)}>
            <option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Session Status</label>
          <select className="form-select" value={sessStatus} onChange={e => setSess(e.target.value)}>
            <option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No Show</option>
          </select>
        </div>
        <div className="form-group full-width">
          <label className="form-label">Session Notes</label>
          <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was covered…" style={{ resize:'vertical', fontFamily:'var(--font-body)' }} />
        </div>
      </div>
    </Modal>
  );
}

function AvailabilityModal({ trainerId, onClose, onSaved }) {
  const [form, setForm] = useState({ day_of_week:'Monday', start_time:'09:00', end_time:'17:00' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSave = async () => {
    setSaving(true); setError('');
    try { await addTrainerAvailability({ trainer_id: trainerId, ...form }); onSaved(); onClose(); }
    catch { setError('Failed to save.'); }
    finally { setSaving(false); }
  };
  return (
    <Modal title={<><span>◷</span> Add Availability</>} onClose={onClose}
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save'}</button></>}>
      {error && <div className="error-banner">{error}</div>}
      <div className="form-grid">
        <div className="form-group full-width">
          <label className="form-label">Day of Week</label>
          <select className="form-select" value={form.day_of_week} onChange={set('day_of_week')}>{DAYS.map(d=><option key={d}>{d}</option>)}</select>
        </div>
        <div className="form-group"><label className="form-label">Start Time</label><input type="time" className="form-input" value={form.start_time} onChange={set('start_time')} /></div>
        <div className="form-group"><label className="form-label">End Time</label><input type="time" className="form-input" value={form.end_time} onChange={set('end_time')} /></div>
      </div>
    </Modal>
  );
}

export default function TrainerApp({ onLogout }) {
  const trainerId  = getUserId();
  const trainerName = getUserName();

  const [sessions,  setSessions]  = useState([]);
  const [users,     setUsers]     = useState([]);
  const [avail,     setAvail]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('today');
  const [markSess,  setMark]      = useState(null);
  const [showAvail, setShowAvail] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, aRes] = await Promise.all([getSessions(), getTrainerAvailability()]);
      const all = sRes.data?.Data || [];
      setSessions(all.filter(s => s.trainer_id === trainerId));
      setAvail(aRes.data?.Data || []);
      try { const uRes = await getUsers(); setUsers(uRes.data?.Data || []); } catch {}
    } finally { setLoading(false); }
  }, [trainerId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useBookingRefresh(fetchAll);

  const clientName = id => { const u = users.find(u => u.id === id); return u ? `${u.first_name} ${u.last_name}` : `Client #${id}`; };
  const myAvail    = avail.filter(a => a.trainer_id === trainerId);

  // Date helpers
  const todayStr   = new Date().toDateString();
  const in7Days    = new Date(); in7Days.setDate(in7Days.getDate() + 7);

  const todaySessions  = sessions.filter(s => s.status === 'scheduled' && new Date(s.scheduled_at).toDateString() === todayStr).sort((a,b) => new Date(a.scheduled_at)-new Date(b.scheduled_at));
  const weeklySessions = sessions.filter(s => s.status === 'scheduled' && new Date(s.scheduled_at) > new Date() && new Date(s.scheduled_at) <= in7Days).sort((a,b) => new Date(a.scheduled_at)-new Date(b.scheduled_at));

  // Stats
  const now = new Date();
  const monthSessions  = sessions.filter(s => { const d = new Date(s.scheduled_at); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); });
  const uniqueClients  = new Set(sessions.map(s => s.client_id)).size;

  const TABS = [
    { id:'today',        label:"Today's Schedule", icon:'◉' },
    { id:'week',         label:'This Week',         icon:'◷' },
    { id:'availability', label:'Availability',       icon:'◈' },
  ];

  const SessionRow = ({ s, showDone = false }) => {
    const sc = STATUS_COLORS[s.status] || STATUS_COLORS.scheduled;
    return (
      <div className="session-item">
        <div className="session-time-col">
          <div className="session-time">{fmtDate(s.scheduled_at)}</div>
          <div style={{ fontSize:12, color:'var(--color-accent)', fontWeight:600 }}>{fmtTime(s.scheduled_at)}</div>
        </div>
        <div className="session-info">
          <div className="session-client">{clientName(s.client_id)}</div>
          <div className="session-trainer">{s.duration_min} min{s.notes ? ` · ${s.notes.slice(0,40)}` : ''}</div>
        </div>
        <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, background:sc.bg, color:sc.color, whiteSpace:'nowrap' }}>{s.status}</span>
        {showDone && <button className="btn btn-secondary btn-sm" onClick={() => setMark(s)}>✓ Done</button>}
      </div>
    );
  };

  return (
    <div className="app">
      <div className="texture-overlay" />

      <header className="header">
        <div className="logo">
          <div className="logo-icon">H</div>
          <div className="logo-text"><h1>HAACHIKO FITNESS</h1><span>Trainer Portal</span></div>
        </div>
        <nav className="nav-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`nav-tab ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>
              <span className="nav-tab-icon">{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
        <ProfileMenu onLogout={onLogout} />
      </header>

      <main className="main-content fade-in">
        {loading ? <div className="loading-state"><div className="spinner" /> Loading…</div> : (
          <>
            {/* ── Trainer stats row ── */}
            <div className="trainer-stats-row">
              {[
                { icon:'◷', label:'Sessions This Month', value: monthSessions.length },
                { icon:'◎', label:'Total Clients',        value: uniqueClients },
                { icon:'◉', label:'Today',                value: todaySessions.length },
                { icon:'◈', label:'This Week',            value: weeklySessions.length },
              ].map((s, i) => (
                <div key={i} className="trainer-stat-card">
                  <div className="trainer-stat-icon">{s.icon}</div>
                  <div className="trainer-stat-value">{s.value}</div>
                  <div className="trainer-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── Today's Schedule ── */}
            {tab === 'today' && (
              <div>
                <div className="page-header">
                  <h2 className="page-title">Today's Schedule</h2>
                  <span style={{ color:'var(--color-text-secondary)', fontSize:14 }}>
                    {new Date().toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' })}
                  </span>
                </div>
                <div className="card">
                  {todaySessions.length === 0 ? (
                    <div className="empty-state"><div className="empty-state-icon">◷</div><p>No sessions scheduled for today</p></div>
                  ) : (
                    <div className="session-list">
                      {todaySessions.map((s,i) => <SessionRow key={i} s={s} showDone />)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── This Week ── */}
            {tab === 'week' && (
              <div>
                <div className="page-header">
                  <h2 className="page-title">Next 7 Days</h2>
                  <span style={{ color:'var(--color-text-secondary)', fontSize:14 }}>{weeklySessions.length} upcoming</span>
                </div>
                <div className="card">
                  {weeklySessions.length === 0 ? (
                    <div className="empty-state"><div className="empty-state-icon">◈</div><p>No sessions in the next 7 days</p></div>
                  ) : (
                    <div className="session-list">
                      {weeklySessions.map((s,i) => <SessionRow key={i} s={s} showDone />)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Availability ── */}
            {tab === 'availability' && (
              <div>
                <div className="page-header">
                  <h2 className="page-title">My Availability</h2>
                  <button className="btn btn-primary" onClick={() => setShowAvail(true)}>+ Add Slot</button>
                </div>
                <div className="card">
                  {myAvail.length === 0 ? (
                    <div className="empty-state"><div className="empty-state-icon">◈</div><p>No availability set yet</p></div>
                  ) : (
                    <table className="table">
                      <thead><tr><th>Day</th><th>Start</th><th>End</th></tr></thead>
                      <tbody>
                        {myAvail.map((a,i) => (
                          <tr key={i}><td style={{ fontWeight:600 }}>{a.day_of_week}</td><td>{a.start_time}</td><td>{a.end_time}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {markSess  && <AttendanceModal session={markSess} users={users} onClose={() => setMark(null)} onSaved={fetchAll} />}
      {showAvail && <AvailabilityModal trainerId={trainerId} onClose={() => setShowAvail(false)} onSaved={fetchAll} />}
      <Chatbot />
    </div>
  );
}
