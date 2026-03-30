import React, { useEffect, useState } from 'react';
import { getUsers, getSessions } from '../api';

function Dashboard({ setActiveTab }) {
  const [users, setUsers]       = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getUsers(), getSessions()])
      .then(([uRes, sRes]) => {
        const allUsers = uRes.data?.Data || [];
        setUsers(allUsers);

        // The sessions endpoint returns them inside a message string — parse what we can
        // If the API returns structured data, use it; otherwise fallback
        const raw = sRes.data;
        if (Array.isArray(raw?.Data)) {
          setSessions(raw.Data);
        } else if (Array.isArray(raw)) {
          setSessions(raw);
        } else {
          setSessions([]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const clients  = users.filter(u => u.role === 'client');
  const trainers = users.filter(u => u.role === 'trainer');

  // Today's sessions: scheduled_at within today
  const today = new Date();
  const todaySessions = sessions.filter(s => {
    if (!s.scheduled_at) return false;
    const d = new Date(s.scheduled_at);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth()    === today.getMonth()    &&
      d.getDate()     === today.getDate()
    );
  });

  const formatTime = (dt) => {
    if (!dt) return '–';
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getUserName = (id) => {
    const u = users.find(u => u.id === id);
    return u ? `${u.first_name} ${u.last_name}` : `#${id}`;
  };

  const stats = [
    { label: 'Active Clients',  value: loading ? '…' : clients.length,  change: 'total registered', icon: '◎' },
    { label: 'Trainers',        value: loading ? '…' : trainers.length, change: 'on staff',          icon: '◉' },
    { label: 'Sessions Today',  value: loading ? '…' : todaySessions.length, change: 'scheduled',   icon: '◷' },
    { label: 'Total Sessions',  value: loading ? '…' : sessions.length, change: 'all time',          icon: '◆' },
  ];

  const quickActions = [
    { label: 'Add New Client',    icon: '+', tab: 'clients'  },
    { label: 'Schedule Session',  icon: '◷', tab: 'schedule' },
    { label: 'Add Trainer',       icon: '◉', tab: 'trainers' },
    { label: 'View Schedule',     icon: '◊', tab: 'schedule' },
  ];

  return (
    <div className="fade-in">
      {/* Stats */}
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
        {/* Today's Sessions */}
        <div className="card">
          <h2 className="card-title">
            <span className="card-title-icon">◷</span>
            Today's Sessions
          </h2>
          {loading ? (
            <div className="loading-state"><div className="spinner" /> Loading sessions…</div>
          ) : todaySessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">◷</div>
              <p>No sessions scheduled for today</p>
            </div>
          ) : (
            <div className="session-list">
              {todaySessions.map((s, i) => (
                <div key={i} className="session-item">
                  <span className="session-time">{formatTime(s.scheduled_at)}</span>
                  <div className="session-info">
                    <div className="session-client">{getUserName(s.client_id)}</div>
                    <div className="session-trainer">with {getUserName(s.trainer_id)}</div>
                  </div>
                  <span className="session-type">{s.duration_min || 60} min</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
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
    </div>
  );
}

export default Dashboard;
