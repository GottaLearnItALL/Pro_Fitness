import React from 'react';
import IC from './icons';
import logo from '../../assets/haachikologo.png';

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',   icon: IC.Dashboard },
  { id: 'schedule',    label: 'Schedule',    icon: IC.Calendar  },
  { id: 'clients',     label: 'Clients',     icon: IC.Users     },
  { id: 'trainers',    label: 'Trainers',    icon: IC.Trainer   },
  { id: 'memberships', label: 'Memberships', icon: IC.Membership },
  { id: 'reports',     label: 'Reports',     icon: IC.Reports   },
];

export default function AdminSidebar({ activeView, setActiveView, adminName, onLogout }) {
  const initial = (adminName || 'A')[0].toUpperCase();
  return (
    <aside className="ad-sidebar">
      <div className="ad-sidebar-logo">
        <div className="ad-logo-mark"><img src={logo} alt="Haachiko" /></div>
        <div className="ad-logo-text">
          <div className="ad-logo-title">Haachiko</div>
          <div className="ad-logo-sub">Admin Portal</div>
        </div>
      </div>

      <nav className="ad-sidebar-nav">
        {NAV.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`ad-nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              <Icon /> <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="ad-sidebar-footer">
        <div className="ad-user-card">
          <div className="ad-user-avatar">{initial}</div>
          <div className="ad-user-info">
            <div className="ad-user-name">{adminName || 'Administrator'}</div>
            <span className="ad-user-badge">Admin Portal</span>
          </div>
        </div>
        <button className="ad-logout-btn" onClick={onLogout}>
          <IC.Logout /> <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
