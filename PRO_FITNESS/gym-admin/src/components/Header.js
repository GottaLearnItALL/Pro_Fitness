import React from 'react';
import ProfileMenu from './ProfileMenu';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'schedule',  label: 'Schedule',  icon: '◷' },
  { id: 'clients',   label: 'Clients',   icon: '◎' },
  { id: 'trainers',  label: 'Trainers',  icon: '◉' },
];

function Header({ activeTab, setActiveTab, onLogout }) {
  return (
    <header className="header">
      <div className="logo">
        <div className="logo-icon">H</div>
        <div className="logo-text">
          <h1>HAACHIKO FITNESS</h1>
          <span>Admin Portal</span>
        </div>
      </div>

      <nav className="nav-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="nav-tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <ProfileMenu onLogout={onLogout} />
    </header>
  );
}

export default Header;
