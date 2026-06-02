import React, { useState, useEffect, useCallback } from 'react';
import {
  getUsers, getSessions, getMemberships, getMembershipPlans, getTrainerAvailability,
} from '../api';
import { getUserName } from '../auth';
import { useBookingRefresh } from '../bookingEvent';

import '../AdminApp.css';

import AdminSidebar     from './admin/AdminSidebar';
import AdminDashboard   from './admin/AdminDashboard';
import AdminClients     from './admin/AdminClients';
import AdminTrainers    from './admin/AdminTrainers';
import AdminSchedule    from './admin/AdminSchedule';
import AdminMemberships from './admin/AdminMemberships';
import AdminReports     from './admin/AdminReports';
import Chatbot          from './Chatbot';

export default function AdminApp({ onLogout }) {
  const [view, setView]               = useState('dashboard');
  const [users, setUsers]             = useState([]);
  const [sessions, setSessions]       = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [plans, setPlans]             = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading]         = useState(true);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      getUsers().catch(() => ({ data: {} })),
      getSessions().catch(() => ({ data: {} })),
      getMemberships().catch(() => ({ data: {} })),
      getMembershipPlans().catch(() => ({ data: {} })),
      getTrainerAvailability().catch(() => ({ data: {} })),
    ])
      .then(([uRes, sRes, mRes, pRes, aRes]) => {
        const arr = (r) => Array.isArray(r?.data?.Data) ? r.data.Data : Array.isArray(r?.data) ? r.data : [];
        setUsers(arr(uRes));
        setSessions(arr(sRes));
        setMemberships(arr(mRes));
        setPlans(arr(pRes));
        setAvailability(arr(aRes));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useBookingRefresh(fetchAll);

  const adminName = getUserName() || 'Administrator';

  const renderView = () => {
    const common = { users, sessions, memberships, plans, availability, loading, refresh: fetchAll };
    switch (view) {
      case 'dashboard':   return <AdminDashboard   {...common} setActiveView={setView} />;
      case 'schedule':    return <AdminSchedule    {...common} />;
      case 'clients':     return <AdminClients     {...common} />;
      case 'trainers':    return <AdminTrainers    {...common} />;
      case 'memberships': return <AdminMemberships {...common} />;
      case 'reports':     return <AdminReports     {...common} />;
      default:            return <AdminDashboard   {...common} setActiveView={setView} />;
    }
  };

  return (
    <div className="ad-layout">
      <AdminSidebar
        activeView={view}
        setActiveView={setView}
        adminName={adminName}
        onLogout={onLogout}
      />
      <main className="ad-main">
        <div className="ad-main-inner">{renderView()}</div>
      </main>
      <Chatbot />
    </div>
  );
}
