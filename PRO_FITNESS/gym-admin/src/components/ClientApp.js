import React, { useEffect, useState, useCallback } from 'react';
import { getSessions, getMyMembership, getMembershipPlansPublic } from '../api';
import { getUserId } from '../auth';
import ProfileMenu from './ProfileMenu';
import Chatbot from './Chatbot';
import { useBookingRefresh } from '../bookingEvent';

const STATUS_COLORS = {
  scheduled: { bg:'rgba(212,175,135,0.15)', color:'#d4af87' },
  completed:  { bg:'rgba(74,222,128,0.15)',  color:'#4ade80' },
  cancelled:  { bg:'rgba(255,100,100,0.15)', color:'#ff6464' },
  no_show:    { bg:'rgba(136,136,136,0.15)', color:'#888'    },
};

export default function ClientApp({ onLogout }) {
  const clientId = getUserId();
  const [sessions, setSessions]     = useState([]);
  const [membership, setMembership] = useState(null);
  const [plans, setPlans]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('sessions');

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, mRes, pRes] = await Promise.all([
        getSessions(),
        getMyMembership(),
        getMembershipPlansPublic(),
      ]);
      const allSessions = sRes.data?.Data || [];
      setSessions(allSessions.filter(s => s.client_id === clientId));

      const myMemberships = mRes.data?.Data || [];
      setMembership(myMemberships[0] || null);   // /memberships/me already filters by user

      setPlans(pRes.data?.Data || []);
    } finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useBookingRefresh(fetchAll);    // re-fetch whenever chatbot books a session

  const upcoming = [...sessions].filter(s => s.status === 'scheduled').sort((a,b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const past     = [...sessions].filter(s => s.status !== 'scheduled').sort((a,b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));

  const planName = membership ? (plans.find(p => p.id === membership.plan_id)?.name || `Plan #${membership.plan_id}`) : null;

  return (
    <div className="app">
      <div className="texture-overlay" />

      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">P</div>
          <div className="logo-text"><h1>ProFitness</h1><span>Member Portal</span></div>
        </div>
        <nav className="nav-tabs">
          {[{id:'sessions',label:'My Sessions',icon:'◷'},{id:'membership',label:'Membership',icon:'◆'}].map(t => (
            <button key={t.id} className={`nav-tab ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>
              <span className="nav-tab-icon">{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
        <ProfileMenu onLogout={onLogout} />
      </header>

      <main className="main-content fade-in">

        {/* ── Sessions Tab ── */}
        {tab === 'sessions' && (
          <div>
            <div className="page-header">
              <h2 className="page-title" style={{ fontFamily:'var(--font-display)' }}>My Sessions</h2>
              <span style={{ color:'var(--color-text-secondary)', fontSize:14 }}>{sessions.length} total</span>
            </div>

            {loading ? <div className="loading-state"><div className="spinner" /> Loading…</div> : (
              <>
                {/* Upcoming */}
                <div className="card" style={{ marginBottom: 24 }}>
                  <h3 className="card-title"><span className="card-title-icon">◷</span> Upcoming ({upcoming.length})</h3>
                  {upcoming.length === 0 ? (
                    <div className="empty-state"><div className="empty-state-icon">◷</div><p>No upcoming sessions</p></div>
                  ) : (
                    <div className="session-list">
                      {upcoming.map((s,i) => {
                        const style = STATUS_COLORS[s.status] || STATUS_COLORS.scheduled;
                        return (
                          <div key={i} className="session-item">
                            <span className="session-time">{new Date(s.scheduled_at).toLocaleDateString([],{month:'short',day:'numeric'})}</span>
                            <div className="session-info">
                              <div className="session-client">{new Date(s.scheduled_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                              <div className="session-trainer">{s.duration_min} min session</div>
                            </div>
                            <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, background:style.bg, color:style.color }}>{s.status}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* History */}
                <div className="card">
                  <h3 className="card-title"><span className="card-title-icon">◈</span> History</h3>
                  {past.length === 0 ? (
                    <div className="empty-state"><div className="empty-state-icon">◈</div><p>No past sessions</p></div>
                  ) : (
                    <div className="session-list">
                      {past.map((s,i) => {
                        const style = STATUS_COLORS[s.status] || STATUS_COLORS.scheduled;
                        return (
                          <div key={i} className="session-item">
                            <span className="session-time">{new Date(s.scheduled_at).toLocaleDateString([],{month:'short',day:'numeric'})}</span>
                            <div className="session-info">
                              <div className="session-client">{s.duration_min} min</div>
                              {s.notes && <div className="session-trainer" style={{fontStyle:'italic',fontSize:12}}>{s.notes.slice(0,60)}{s.notes.length>60?'…':''}</div>}
                            </div>
                            <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, background:style.bg, color:style.color }}>{s.status}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Membership Tab ── */}
        {tab === 'membership' && (
          <div>
            <div className="page-header">
              <h2 className="page-title" style={{ fontFamily:'var(--font-display)' }}>My Membership</h2>
            </div>

            {loading ? <div className="loading-state"><div className="spinner" /> Loading…</div> : !membership ? (
              <div className="card">
                <div className="empty-state"><div className="empty-state-icon">◆</div><p>No active membership found</p></div>
              </div>
            ) : (
              <div className="stats-grid">
                {[
                  { label:'Plan', value: planName, icon:'◆' },
                  { label:'Status', value: membership.status || 'active', icon:'◎' },
                  { label:'Sessions Left', value: membership.sessions_remaining ?? '—', icon:'◷' },
                  { label:'Expires', value: membership.end_date ? new Date(membership.end_date).toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'}) : '—', icon:'◈' },
                ].map((stat, i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-card-bg">{stat.icon}</div>
                    <span className="stat-label">{stat.label}</span>
                    <div className="stat-value" style={{ fontSize: stat.label === 'Plan' ? 22 : 36 }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Chatbot />
    </div>
  );
}
