import React, { useState, useEffect, useRef } from 'react';
import { getUserName, clearToken } from '../auth';

export default function ProfileMenu({ onLogout }) {
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);
  const name            = getUserName();
  const initial         = name ? name.charAt(0).toUpperCase() : '?';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = () => {
    setOpen(false);
    clearToken();
    onLogout();
  };

  return (
    <div className="profile-menu" ref={ref}>
      <button className="profile-trigger" onClick={() => setOpen(o => !o)}>
        <div className="user-avatar">{initial}</div>
        <span className="profile-name">{name || 'Account'}</span>
        <span className="profile-chevron">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-header">
            <div className="profile-dropdown-initial">{initial}</div>
            <div className="profile-dropdown-name">{name}</div>
          </div>
          <div className="profile-dropdown-divider" />
          <button className="profile-dropdown-item profile-signout" onClick={handleSignOut}>
            <span>⎋</span> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
