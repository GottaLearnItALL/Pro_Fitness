import React, { useState, useMemo } from 'react';
import IC from './icons';
import SlideOver from './SlideOver';
import { createSession } from '../../api';
import { fmtDate as fmtDateTz } from '../../timezone';
import { getTimezone } from '../../auth';

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const HOUR_LABELS = HOURS.map(h => h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`);

function weekStart(offset = 0) {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtWeek(ws) {
  const we = new Date(ws); we.setDate(we.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  const tz = getTimezone();
  try {
    return `${ws.toLocaleDateString('en-US', { timeZone: tz, ...opts })} – ${we.toLocaleDateString('en-US', { timeZone: tz, ...opts })}`;
  } catch {
    return `${ws.toLocaleDateString('en-US', opts)} – ${we.toLocaleDateString('en-US', opts)}`;
  }
}

const EMPTY_SESSION = {
  client_id: '', trainer_id: '', membership_id: '',
  scheduled_at: '', duration_min: 60, notes: '',
};

function SessionForm({ users, memberships, onClose, onSaved }) {
  const [form, setForm]     = useState(EMPTY_SESSION);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const clients  = users.filter(u => u.role === 'client');
  const trainers = users.filter(u => u.role === 'trainer');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setError('');
    if (!form.client_id || !form.trainer_id || !form.scheduled_at) {
      setError('Client, trainer, and date/time are required.'); return;
    }
    setSaving(true);
    try {
      await createSession({
        client_id:     parseInt(form.client_id),
        trainer_id:    parseInt(form.trainer_id),
        membership_id: form.membership_id ? parseInt(form.membership_id) : undefined,
        scheduled_at:  new Date(form.scheduled_at).toISOString(),
        duration_min:  parseInt(form.duration_min) || 60,
        notes:         form.notes,
      });
      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create session.');
    } finally { setSaving(false); }
  };

  // Filter memberships by selected client
  const clientMemberships = form.client_id
    ? memberships.filter(m => m.client_id === parseInt(form.client_id))
    : memberships;

  return (
    <SlideOver
      title="Schedule New Session"
      sub="Book a training session for a member"
      onClose={onClose}
      footer={
        <>
          <button className="ad-btn ad-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="ad-btn ad-btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Schedule Session'}
          </button>
        </>
      }
    >
      {error && <div className="ad-error">{error}</div>}

      <div className="ad-panel-section-label">Participants</div>
      <div className="ad-form-grid">
        <div className="ad-form-group">
          <label className="ad-form-label">Client *</label>
          <select className="ad-form-select" value={form.client_id} onChange={set('client_id')}>
            <option value="">Select client…</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>
        <div className="ad-form-group">
          <label className="ad-form-label">Trainer *</label>
          <select className="ad-form-select" value={form.trainer_id} onChange={set('trainer_id')}>
            <option value="">Select trainer…</option>
            {trainers.map(t => (
              <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
            ))}
          </select>
        </div>
        <div className="ad-form-group full">
          <label className="ad-form-label">Membership</label>
          <select className="ad-form-select" value={form.membership_id} onChange={set('membership_id')}>
            <option value="">Auto-select</option>
            {clientMemberships.map(m => (
              <option key={m.id} value={m.id}>
                #{m.id} {m.sessions_remaining != null ? `· ${m.sessions_remaining} sessions left` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ad-panel-section-label">When</div>
      <div className="ad-form-grid">
        <div className="ad-form-group full">
          <label className="ad-form-label">Date &amp; Time *</label>
          <input className="ad-form-input" type="datetime-local" value={form.scheduled_at} onChange={set('scheduled_at')} />
        </div>
        <div className="ad-form-group">
          <label className="ad-form-label">Duration (min)</label>
          <input className="ad-form-input" type="number" min="15" step="15" value={form.duration_min} onChange={set('duration_min')} />
        </div>
      </div>

      <div className="ad-panel-section-label">Additional</div>
      <div className="ad-form-group full">
        <label className="ad-form-label">Notes</label>
        <textarea className="ad-form-textarea" placeholder="Optional notes for this session…" value={form.notes} onChange={set('notes')} />
      </div>
    </SlideOver>
  );
}

export default function AdminSchedule({ users, sessions, memberships, loading, refresh }) {
  const [offset, setOffset]         = useState(0);
  const [trainerFilter, setFilter]  = useState('all');
  const [showAdd, setShowAdd]       = useState(false);

  const trainers = useMemo(() => users.filter(u => u.role === 'trainer'), [users]);

  const ws = weekStart(offset);
  const we = new Date(ws); we.setDate(we.getDate() + 7);

  const eventMap = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      if (!s.scheduled_at) return;
      if (trainerFilter !== 'all' && s.trainer_id !== parseInt(trainerFilter)) return;
      const d = new Date(s.scheduled_at);
      const sd = new Date(d); sd.setHours(0,0,0,0);
      if (sd < ws || sd >= we) return;
      const dow = d.getDay();
      const di  = dow === 0 ? 6 : dow - 1;
      const hr  = d.getHours();
      const key = `${hr}-${di}`;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [sessions, trainerFilter, ws, we]);

  const getName = (id, short = false) => {
    const u = users.find(u => u.id === id);
    if (!u) return `#${id}`;
    return short ? `${u.first_name} ${(u.last_name || '')[0] || ''}.` : `${u.first_name} ${u.last_name}`;
  };

  return (
    <div className="ad-fade-in">
      <div className="ad-page-header">
        <div className="ad-page-titles">
          <div className="ad-page-title">Schedule</div>
          <div className="ad-page-sub">Weekly view of all training sessions</div>
        </div>
        <div className="ad-page-actions">
          <select className="ad-filter-select" value={trainerFilter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All trainers</option>
            {trainers.map(t => (
              <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
            ))}
          </select>
          <div className="ad-week-nav">
            <button className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => setOffset(o => o - 1)}>
              <IC.ChevronLeft />
            </button>
            <div className="ad-week-label">{fmtWeek(ws)}</div>
            <button className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => setOffset(o => o + 1)}>
              <IC.ChevronRight />
            </button>
          </div>
          <button className="ad-btn ad-btn-primary" onClick={() => setShowAdd(true)}>
            <IC.Plus /> New Session
          </button>
        </div>
      </div>

      <div className="ad-cal-wrap">
        {loading ? (
          <div className="ad-loading"><span className="ad-spinner" /> Loading schedule…</div>
        ) : (
          <div className="ad-cal-grid">
            <div className="ad-cal-head" />
            {DAYS.map((d, i) => {
              const dayDate = new Date(ws); dayDate.setDate(dayDate.getDate() + i);
              return (
                <div key={d} className="ad-cal-head">
                  {d} <span style={{ color:'#a0aab8', fontWeight: 500 }}>{dayDate.getDate()}</span>
                </div>
              );
            })}

            {HOURS.map((h, hi) => (
              <React.Fragment key={h}>
                <div className="ad-cal-time">{HOUR_LABELS[hi]}</div>
                {DAYS.map((_, di) => {
                  const cell = eventMap[`${h}-${di}`] || [];
                  return (
                    <div key={di} className="ad-cal-cell">
                      {cell.map((ev, i) => (
                        <div key={i} className="ad-cal-event" title={ev.notes || ''}>
                          <div className="ad-cal-event-name">{getName(ev.client_id, true)}</div>
                          <div className="ad-cal-event-trainer">w/ {getName(ev.trainer_id, true)}</div>
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

      {showAdd && (
        <SessionForm
          users={users}
          memberships={memberships}
          onClose={() => setShowAdd(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
