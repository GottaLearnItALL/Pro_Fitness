import React, { useEffect, useState, useCallback } from 'react';
import { getSessions, getUsers, getTrainerAvailability, addTrainerAvailability, postAttendance, updateSession } from '../api';
import { getUserId } from '../auth';
import Modal from './Modal';
import Chatbot from './Chatbot';
import ProfileMenu from './ProfileMenu';
import { useBookingRefresh } from '../bookingEvent';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function AttendanceModal({ session, users, onClose, onSaved }) {
  const [attStatus, setAttStatus]     = useState('present');
  const [sessStatus, setSessStatus]   = useState('completed');
  const [notes, setNotes]             = useState(session.notes || '');
  const [saving, setSaving]           = useState(false);

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
        <div style={{ fontSize:13, color:'#888' }}>{new Date(session.scheduled_at).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' })}</div>
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Client Attendance</label>
          <select className="form-select" value={attStatus} onChange={e => setAttStatus(e.target.value)}>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Session Status</label>
          <select className="form-select" value={sessStatus} onChange={e => setSessStatus(e.target.value)}>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
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
  const [form, setForm] = useState({ day_of_week: 'Monday', start_time: '09:00', end_time: '17:00' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await addTrainerAvailability({ trainer_id: trainerId, ...form });
      onSaved(); onClose();
    } catch { setError('Failed to save availability.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={<><span>◷</span> Add Availability</>} onClose={onClose}
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save'}</button></>}>
      {error && <div className="error-banner">{error}</div>}
      <div className="form-grid">
        <div className="form-group full-width">
          <label className="form-label">Day of Week</label>
          <select className="form-select" value={form.day_of_week} onChange={set('day_of_week')}>
            {DAYS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Start Time</label>
          <input type="time" className="form-input" value={form.start_time} onChange={set('start_time')} />
        </div>
        <div className="form-group">
          <label className="form-label">End Time</label>
          <input type="time" className="form-input" value={form.end_time} onChange={set('end_time')} />
        </div>
      </div>
    </Modal>
  );
}

export default function TrainerApp({ onLogout }) {
  const trainerId = getUserId();
  const [sessions, setSessions]   = useState([]);
  const [users, setUsers]         = useState([]);
  const [availability, setAvail]  = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('schedule');
  const [markSession, setMark]    = useState(null);
  const [showAvail, setShowAvail] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, aRes] = await Promise.all([getSessions(), getTrainerAvailability()]);
      const allSessions = sRes.data?.Data || [];
      setSessions(allSessions.filter(s => s.trainer_id === trainerId));
      setAvail(aRes.data?.Data || []);

      // get users separately (admin-only endpoint, trainers won't have access — gracefully degrade)
      try { const uRes = await getUsers(); setUsers(uRes.data?.Data || []); } catch {}
    } finally { setLoading(false); }
  }, [trainerId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useBookingRefresh(fetchAll);    // re-fetch whenever chatbot books a session

  const myAvail = availability.filter(a => a.trainer_id === trainerId);
  const upcoming = [...sessions].sort((a,b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)).filter(s => s.status === 'scheduled');
  const past     = [...sessions].sort((a,b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)).filter(s => s.status !== 'scheduled').slice(0, 10);

  const getUserName = id => { const u = users.find(u => u.id === id); return u ? `${u.first_name} ${u.last_name}` : `#${id}`; };

  const STATUS_COLOR = { scheduled:'#d4af87', completed:'#4ade80', cancelled:'#ff6464', no_show:'#888' };

  return (
    <div className="app">
      <div className="texture-overlay" />

      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">H</div>
          <div className="logo-text"><h1>HAACHIKO FITNESS</h1><span>Trainer Portal</span></div>
        </div>
        <nav className="nav-tabs">
          {[{id:'schedule',label:'My Schedule',icon:'◷'},{id:'availability',label:'Availability',icon:'◈'}].map(t => (
            <button key={t.id} className={`nav-tab ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>
              <span className="nav-tab-icon">{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
        <ProfileMenu onLogout={onLogout} />
      </header>

      <main className="main-content fade-in">
        {/* ── Schedule Tab ── */}
        {tab === 'schedule' && (
          <div>
            <div className="page-header">
              <h2 className="page-title" style={{ fontFamily:'var(--font-display)' }}>My Schedule</h2>
            </div>

            {loading ? <div className="loading-state"><div className="spinner" /> Loading…</div> : (
              <>
                {/* Upcoming */}
                <div className="card" style={{ marginBottom: 24 }}>
                  <h3 className="card-title"><span className="card-title-icon">◷</span> Upcoming Sessions ({upcoming.length})</h3>
                  {upcoming.length === 0 ? <div className="empty-state"><div className="empty-state-icon">◷</div><p>No upcoming sessions</p></div> : (
                    <div className="session-list">
                      {upcoming.map((s,i) => (
                        <div key={i} className="session-item">
                          <span className="session-time">{new Date(s.scheduled_at).toLocaleDateString([],{month:'short',day:'numeric'})}</span>
                          <div className="session-info">
                            <div className="session-client">{getUserName(s.client_id)}</div>
                            <div className="session-trainer">{s.duration_min} min · {s.notes || 'No notes'}</div>
                          </div>
                          <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, background:'rgba(212,175,135,0.15)', color:'#d4af87' }}>{s.status}</span>
                          <button className="btn btn-secondary btn-sm" onClick={() => setMark(s)}>✓ Done</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Past */}
                <div className="card">
                  <h3 className="card-title"><span className="card-title-icon">◈</span> Recent History</h3>
                  {past.length === 0 ? <div className="empty-state"><div className="empty-state-icon">◈</div><p>No past sessions</p></div> : (
                    <div className="session-list">
                      {past.map((s,i) => (
                        <div key={i} className="session-item">
                          <span className="session-time">{new Date(s.scheduled_at).toLocaleDateString([],{month:'short',day:'numeric'})}</span>
                          <div className="session-info">
                            <div className="session-client">{getUserName(s.client_id)}</div>
                            {s.notes && <div className="session-trainer" style={{fontStyle:'italic'}}>{s.notes.slice(0,60)}{s.notes.length>60?'…':''}</div>}
                          </div>
                          <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, background:`rgba(0,0,0,0.2)`, color: STATUS_COLOR[s.status] || '#888' }}>{s.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Availability Tab ── */}
        {tab === 'availability' && (
          <div>
            <div className="page-header">
              <h2 className="page-title" style={{ fontFamily:'var(--font-display)' }}>My Availability</h2>
              <button className="btn btn-primary" onClick={() => setShowAvail(true)}>+ Add Slot</button>
            </div>
            {loading ? <div className="loading-state"><div className="spinner" /> Loading…</div> : (
              <div className="card">
                {myAvail.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-icon">◈</div><p>No availability set yet</p></div>
                ) : (
                  <table className="table">
                    <thead><tr><th>Day</th><th>Start</th><th>End</th></tr></thead>
                    <tbody>
                      {myAvail.map((a,i) => (
                        <tr key={i}>
                          <td style={{ fontWeight:600 }}>{a.day_of_week}</td>
                          <td>{a.start_time}</td>
                          <td>{a.end_time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {markSession && <AttendanceModal session={markSession} users={users} onClose={() => setMark(null)} onSaved={fetchAll} />}
      {showAvail   && <AvailabilityModal trainerId={trainerId} onClose={() => setShowAvail(false)} onSaved={fetchAll} />}
      <Chatbot />
    </div>
  );
}
