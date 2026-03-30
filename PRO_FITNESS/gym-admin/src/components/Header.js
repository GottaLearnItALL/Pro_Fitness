import React from 'react';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'schedule',  label: 'Schedule',  icon: '◷' },
  { id: 'clients',   label: 'Clients',   icon: '◎' },
  { id: 'trainers',  label: 'Trainers',  icon: '◉' },
];

function Header({ activeTab, setActiveTab }) {
  return (
    <header className="header">
      <div className="logo">
        <div className="logo-icon">F</div>
        <div className="logo-text">
          <h1>FitnessPro</h1>
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

      <div className="user-profile">
        <div className="status-indicator" />
        <div className="user-avatar">AD</div>
      </div>
    </header>
  );
}

export default Header;
