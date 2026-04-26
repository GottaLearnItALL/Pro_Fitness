import React, { useState, useEffect } from 'react';
import './App.css';

import { getRole, isTokenValid, clearToken } from './auth';

import LandingPage  from './components/LandingPage';
import Login        from './components/Login';
import Register     from './components/Register';
import Header       from './components/Header';
import Dashboard    from './components/Dashboard';
import Schedule     from './components/Schedule';
import Clients      from './components/Clients';
import Trainers     from './components/Trainers';
import Chatbot      from './components/Chatbot';
import TrainerApp   from './components/TrainerApp';
import ClientApp    from './components/ClientApp';

// view: 'landing' | 'login' | 'register' | 'admin' | 'trainer' | 'client'
function roleToView(role) {
  if (role === 'admin')   return 'admin';
  if (role === 'trainer') return 'trainer';
  if (role === 'client')  return 'client';
  return 'landing';
}

export default function App() {
  const [view, setView]                   = useState('landing');
  const [activeTab, setActiveTab]         = useState('dashboard');
  const [selectedPlan, setSelectedPlan]   = useState(null);
  const [goPricing, setGoPricing]         = useState(false);

  // On mount: restore session if token is still valid
  useEffect(() => {
    if (isTokenValid()) {
      setView(roleToView(getRole()));
    }
  }, []);

  const handleLoginSuccess = (role) => setView(roleToView(role));

  const handleLogout = () => {
    clearToken();
    setView('landing');
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setGoPricing(false);
    setView('register');
  };

  // ── Landing ──────────────────────────────────────────────────
  if (view === 'landing') {
    return (
      <LandingPage
        onLogin={()          => { setGoPricing(false); setView('login'); }}
        onSelectPlan={handleSelectPlan}
        scrollToPricing={goPricing}
      />
    );
  }

  // ── Login ────────────────────────────────────────────────────
  if (view === 'login') {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onGoRegister={() => { setGoPricing(true);  setView('landing'); }} // back to landing, scroll to pricing
        onGoLanding={()  => { setGoPricing(false); setView('landing'); }}
      />
    );
  }

  // ── Register ─────────────────────────────────────────────────
  if (view === 'register') {
    return (
      <Register
        selectedPlan={selectedPlan}
        onLoginSuccess={handleLoginSuccess}
        onGoLogin={()   => setView('login')}
        onGoLanding={() => { setSelectedPlan(null); setView('landing'); }}
      />
    );
  }

  // ── Trainer portal ───────────────────────────────────────────
  if (view === 'trainer') {
    return <TrainerApp onLogout={handleLogout} />;
  }

  // ── Client / Member portal ───────────────────────────────────
  if (view === 'client') {
    return <ClientApp onLogout={handleLogout} />;
  }

  // ── Admin panel ──────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} />;
      case 'schedule':  return <Schedule />;
      case 'clients':   return <Clients />;
      case 'trainers':  return <Trainers />;
      default:          return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="app">
      <div className="texture-overlay" />
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />
      <main className="main-content">{renderContent()}</main>
      <Chatbot />
    </div>
  );
}
