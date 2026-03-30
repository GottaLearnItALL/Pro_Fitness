import React, { useEffect, useState, useCallback } from 'react';
import { getSessions, getUsers, createSession, getMemberships } from '../api';
import Modal from './Modal';

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const HOUR_LABELS = HOURS.map(h =>
  h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`
);

function getWeekStart(offset = 0) {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day); // align to Monday
  d.setDate(d.getDate() + diff + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  return `${weekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

function Schedule() {
  const [sessions, setSessions]     = useState([]);
  const [users, setUsers]           = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);

  const [form, setForm] = useState({
    client_id: '', trainer_id: '', membership_id: '',
    scheduled_at: '', duration_min: 60, notes: '',
  });

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([getSessions(), getUsers(), getMemberships()])
      .then(([sRes, uRes, mRes]) => {
        const rawSessions = sRes.data;
        if (Array.isArray(rawSessions?.Data)) setSessions(rawSessions.Data);
        else if (Array.isArray(rawSessions)) setSessions(rawSessions);
        else setSessions([]);

        setUsers(uRes.data?.Data || []);

        const rawM = mRes.data;
        if (Array.isArray(rawM?.Data)) setMemberships(rawM.Data);
        else if (Array.isArray(rawM)) setMemberships(rawM);
        else setMemberships([]);
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const weekStart = getWeekStart(weekOffset);

  // Map sessions to calendar cells: { 'hour-dayIndex': [session, ...] }
  const eventMap = {};
  sessions.forEach(s => {
    if (!s.scheduled_at) return;
    const d = new Date(s.scheduled_at);
    const dayOfWeek = d.getDay(); // 0=Sun
    const dayIndex  = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0..Sun=6
    const hour = d.getHours();

    // Check if within current week
    const sessionDate = new Date(d);
    sessionDate.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    if (sessionDate < weekStart || sessionDate >= weekEnd) return;

    const key = `${hour}-${dayIndex}`;
    if (!eventMap[key]) eventMap[key] = [];
    eventMap[key].push(s);
  });

  const getUserName = (id, short = false) => {
    const u = users.find(u => u.id === parseInt(id));
    if (!u) return `#${id}`;
    return short
      ? `${u.first_name} ${u.last_name[0]}.`
      : `${u.first_name} ${u.last_name}`;
  };

  const clients  = users.filter(u => u.role === 'client');
  const trainers = users.filter(u => u.role === 'trainer');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.client_id || !form.trainer_id || !form.membership_id || !form.scheduled_at) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      await createSession({
        client_id:    parseInt(form.client_id),
        trainer_id:   parseInt(form.trainer_id),
        membership_id: parseInt(form.membership_id),
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_min: parseInt(form.duration_min),
        notes:        form.notes,
      });
      setShowModal(false);
      setForm({ client_id: '', trainer_id: '', membership_id: '', scheduled_at: '', duration_min: 60, notes: '' });
      fetchData();
    } catch (err) {
      setError('Failed to create session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2 className="page-title">Weekly Schedule</h2>
        <div className="page-actions">
          <div className="week-nav">
            <button className="btn btn-secondary" onClick={() => setWeekOffset(w => w - 1)}>← Prev</button>
            <span className="week-label">{formatWeekLabel(weekStart)}</span>
            <button className="btn btn-secondary" onClick={() => setWeekOffset(w => w + 1)}>Next →</button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Session</button>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', overflowX: 'auto' }}>
        {loading ? (
          <div className="loading-state"><div className="spinner" /> Loading schedule…</div>
        ) : (
          <div className="calendar-grid">
            {/* Header */}
            <div className="calendar-header" />
            {DAYS.map(d => (
              <div key={d} className="calendar-header">{d}</div>
            ))}

            {/* Rows */}
            {HOURS.map((hour, hi) => (
              <React.Fragment key={hour}>
                <div className="calendar-time">{HOUR_LABELS[hi]}</div>
                {DAYS.map((_, di) => {
                  const cellEvents = eventMap[`${hour}-${di}`] || [];
                  return (
                    <div key={di} className="calendar-cell">
                      {cellEvents.map((ev, ei) => (
                        <div key={ei} className="calendar-event" title={ev.notes || ''}>
                          <div className="calendar-event-name">{getUserName(ev.client_id, true)}</div>
                          <div className="calendar-event-trainer">{getUserName(ev.trainer_id, true)}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* New Session Modal */}
      {showModal && (
        <Modal
          title={<><span>◷</span> Schedule Session</>}
          onClose={() => { setShowModal(false); setError(''); }}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); setError(''); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : 'Schedule'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSubmit}>
            {error && <div className="error-banner">{error}</div>}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Client *</label>
                <select className="form-select" value={form.client_id}
                  onChange={e => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">Select client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Trainer *</label>
                <select className="form-select" value={form.trainer_id}
                  onChange={e => setForm({ ...form, trainer_id: e.target.value })}>
                  <option value="">Select trainer</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Membership *</label>
                <select className="form-select" value={form.membership_id}
                  onChange={e => setForm({ ...form, membership_id: e.target.value })}>
                  <option value="">Select membership</option>
                  {memberships.map(m => (
                    <option key={m.id} value={m.id}>#{m.id} — Client {m.client_id}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Duration (min)</label>
                <input className="form-input" type="number" min="15" step="15"
                  value={form.duration_min}
                  onChange={e => setForm({ ...form, duration_min: e.target.value })} />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Date & Time *</label>
                <input className="form-input" type="datetime-local"
                  value={form.scheduled_at}
                  onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Notes</label>
                <input className="form-input" type="text" placeholder="Optional notes…"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Schedule;
