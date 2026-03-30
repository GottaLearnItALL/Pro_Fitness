import React, { useState } from 'react';
import './App.css';

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Schedule from './components/Schedule';
import Clients from './components/Clients';
import Trainers from './components/Trainers';
import Chatbot from './components/Chatbot';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

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
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">{renderContent()}</main>
      <Chatbot />
    </div>
  );
}

export default App;
