import React, { useState, useEffect } from 'react';
import { useWorkspace } from './context/WorkspaceContext';
import AuthView from './views/AuthView';
import LinearLandingPage from './views/LinearLandingPage';
import DashboardLayout from './components/DashboardLayout';
import TicketHub from './components/TicketHub';
import ReviewConsole from './components/ReviewConsole';
import WorkspaceStatusPanel from './components/WorkspaceStatusPanel';
import ConnectionPanel from './components/ConnectionPanel';
import CreateWorkspaceView from './views/CreateWorkspaceView';

export default function App() {
  const { token, activeWorkspace } = useWorkspace();
  const [currentDashboard, setCurrentDashboard] = useState('support'); // tracks 'support' or 'review' dashboard views
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  // Automatically reset to landing page or redirect to registration on logout
  useEffect(() => {
    if (!token || !activeWorkspace) {
      if (sessionStorage.getItem('redirect_to_register') === 'true') {
        sessionStorage.removeItem('redirect_to_register');
        setAuthMode('register');
        setShowAuth(true);
      } else {
        setShowAuth(false);
      }
    }
  }, [token, activeWorkspace]);

  // Global Context Security Route Shield Gate
  if (!token || !activeWorkspace) {
    if (showAuth) {
      return <AuthView initialMode={authMode} onBackToLanding={() => setShowAuth(false)} />;
    }
    return (
      <LinearLandingPage 
        onLaunchConsole={(mode) => {
          setAuthMode(mode);
          setShowAuth(true);
        }} 
      />
    );
  }

  return (
    <DashboardLayout 
      currentDashboard={currentDashboard} 
      setCurrentDashboard={setCurrentDashboard}
    >
      {currentDashboard === 'support' ? (
        <div className="space-y-8 animate-fadeIn">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Support Hub</h2>
            <p className="text-sm text-slate-500 font-semibold font-sans">BOLA-protected multi-tenant operational ticket interface.</p>
          </div>
          
          {/* Status & Connection Headers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <WorkspaceStatusPanel />
            </div>
            <div className="lg:col-span-1">
              <ConnectionPanel />
            </div>
          </div>

          {/* Ticket Hub Board */}
          <TicketHub />
        </div>
      ) : currentDashboard === 'review' ? (
        <div className="space-y-8 animate-fadeIn">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Review & Audit Console</h2>
            <p className="text-sm text-slate-500 font-semibold font-sans">N-approval governance matrices and cryptographic audit trails.</p>
          </div>
          <ReviewConsole />
        </div>
      ) : currentDashboard === 'create-workspace' ? (
        <CreateWorkspaceView 
          onCreated={() => setCurrentDashboard('support')} 
          onCancel={() => setCurrentDashboard('support')} 
        />
      ) : null}
    </DashboardLayout>
  );
}