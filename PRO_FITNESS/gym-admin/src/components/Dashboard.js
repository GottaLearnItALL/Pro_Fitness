import React, { useEffect, useState, useCallback } from 'react';
import { getUsers, getSessions, postAttendance, updateSession } from '../api';
import Modal from './Modal';

const STATUS_COLORS = {
  scheduled:  { bg: 'rgba(212,175,135,0.15)', color: '#d4af87' },
  completed:  { bg: 'rgba(74,222,128,0.15)',  color: '#4ade80' },
  cancelled:  { bg: 'rgba(255,100,100,0.15)', color: '#ff6464' },
  no_show:    { bg: 'rgba(136,136,136,0.15)', color: '#888'    },
};

function AttendanceModal({ session, users, onClose, onSaved }) {
  const [attendanceStatus, setAttendanceStatus] = useState('present');
  const [sessionStatus, setSessionStatus]       = useState(session.status || 'completed');
  const [notes, setNotes]                       = useState(session.notes || '');
  const [saving, setSaving]                     = useState(false);
  const [error, setError]                       = useState('');

  const client  = users.find(u => u.id === session.client_id);
  const trainer = users.find(u => u.id === session.trainer_id);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const today = new Date().toISOString().split('T')[0];

      await Promise.all([
        // Mark client attendance
        postAttendance({
          session_id: session.id,
          user_id:    session.client_id,
          role:       'client',
          check_in:   today,
          status:     attendanceStatus,
        }),
        // Update session status + notes
        updateSession(session.id, {
          status: sessionStatus,
          notes:  notes,
        }),
      ]);

      onSaved();
      onClose();
    } catch (e) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={<><span>✓</span> Mark Attendance</>}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {error && <div className="error-banner">{error}</div>}

      {/* Session info */}
      <div style={{ padding: '14px 18px', background: 'rgba(212,175,135,0.07)', borderRadius: 10, border: '1px solid rgba(212,175,135,0.15)', marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {client ? `${client.first_name} ${client.last_name}` : `Client #${session.client_id}`}
        </div>
        <div style={{ fontSize: 13, color: '#888' }}>
          with {trainer ? `${trainer.first_name} ${trainer.last_name}` : `Trainer #${session.trainer_id}`}
          {' · '}{new Date(session.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div className="form-grid">
        {/* Attendance status */}
        <div className="form-group">
          <label className="form-label">Client Attendance</label>
          <select className="form-select" value={attendanceStatus} onChange={e => setAttendanceStatus(e.target.value)}>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
          </select>
        </div>

        {/* Session status */}
        <div className="form-group">
          <label className="form-label">Session Status</label>
          <select className="form-select" value={sessionStatus} onChange={e => setSessionStatus(e.target.value)}>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>

        {/* Notes */}
        <div className="form-group full-width">
          <label className="form-label">Session Notes</label>
          <textarea
            className="form-input"
            placeholder="What was covered in this session…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </div>
      </div>
    </Modal>
  );
}

function Dashboard({ setActiveTab }) {
  const [users, setUsers]             = useState([]);
  const [sessions, setSessions]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedSession, setSelected] = useState(null);

  const fetchData = useCallback(() => {
    Promise.all([getUsers(), getSessions()])
      .then(([uRes, sRes]) => {
        setUsers(uRes.data?.Data || []);
        const raw = sRes.data;
        setSessions(Array.isArray(raw?.Data) ? raw.Data : Array.isArray(raw) ? raw : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const clients  = users.filter(u => u.role === 'client');
  const trainers = users.filter(u => u.role === 'trainer');

  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
    .slice(0, 5);

  const getUserName = (id) => {
    const u = users.find(u => u.id === id);
    return u ? `${u.first_name} ${u.last_name}` : `#${id}`;
  };

  const stats = [
    { label: 'Active Clients',  value: loading ? '…' : clients.length,  change: 'total registered', icon: '◎' },
    { label: 'Trainers',        value: loading ? '…' : trainers.length, change: 'on staff',          icon: '◉' },
    { label: 'Total Sessions',  value: loading ? '…' : sessions.length, change: 'all time',          icon: '◷' },
    { label: 'Active Members',  value: loading ? '…' : clients.length,  change: 'registered',        icon: '◆' },
  ];

  const quickActions = [
    { label: 'Add New Client',   icon: '+', tab: 'clients'  },
    { label: 'Schedule Session', icon: '◷', tab: 'schedule' },
    { label: 'Add Trainer',      icon: '◉', tab: 'trainers' },
    { label: 'View Schedule',    icon: '◊', tab: 'schedule' },
  ];

  return (
    <div className="fade-in">
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-bg">{s.icon}</div>
            <span className="stat-label">{s.label}</span>
            <div className="stat-value">{s.value}</div>
            <span className="stat-change">{s.change}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h2 className="card-title">
            <span className="card-title-icon">◷</span>
            Recent Sessions
          </h2>
          {loading ? (
            <div className="loading-state"><div className="spinner" /> Loading sessions…</div>
          ) : recentSessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">◷</div>
              <p>No sessions found</p>
            </div>
          ) : (
            <div className="session-list">
              {recentSessions.map((s, i) => {
                const style = STATUS_COLORS[s.status] || STATUS_COLORS.scheduled;
                return (
                  <div key={i} className="session-item">
                    <span className="session-time">
                      {new Date(s.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="session-info">
                      <div className="session-client">{getUserName(s.client_id)}</div>
                      <div className="session-trainer">with {getUserName(s.trainer_id)}</div>
                      {s.notes && (
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2, fontStyle: 'italic' }}>
                          {s.notes.length > 60 ? s.notes.slice(0, 60) + '…' : s.notes}
                        </div>
                      )}
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
                      {s.status}
                    </span>
                    {s.status === 'scheduled' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelected(s)}>
                        ✓ Done
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Quick Actions</h2>
          <div className="quick-actions">
            {quickActions.map((a, i) => (
              <button key={i} className="action-btn" onClick={() => setActiveTab(a.tab)}>
                <span className="action-btn-icon">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedSession && (
        <AttendanceModal
          session={selectedSession}
          users={users}
          onClose={() => setSelected(null)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}

export default Dashboard;
