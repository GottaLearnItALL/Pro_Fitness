import React, { useState, useEffect } from 'react';
import './App.css';

import { getRole, isTokenValid, clearToken } from './auth';

import LandingPage    from './components/LandingPage';
import Login          from './components/Login';
import Register       from './components/Register';
import ResetPassword  from './components/ResetPassword';
import AdminApp       from './components/AdminApp';
import TrainerApp     from './components/TrainerApp';
import ClientApp      from './components/ClientApp';

// view: 'landing' | 'login' | 'register' | 'admin' | 'trainer' | 'client'
function roleToView(role) {
  if (role === 'admin')   return 'admin';
  if (role === 'trainer') return 'trainer';
  if (role === 'client')  return 'client';
  return 'landing';
}

export default function App() {
  const [view, setView]                   = useState('landing');
  const [selectedPlan, setSelectedPlan]   = useState(null);
  const [goPricing, setGoPricing]         = useState(false);

  // On mount: check for reset token in URL, or restore session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) {
      setView('reset-password');
      return;
    }
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

  // ── Reset Password ───────────────────────────────────────────
  if (view === 'reset-password') {
    return (
      <ResetPassword
        onGoLogin={() => {
          window.history.replaceState({}, '', '/');
          setView('login');
        }}
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
  return <AdminApp onLogout={handleLogout} />;
}
