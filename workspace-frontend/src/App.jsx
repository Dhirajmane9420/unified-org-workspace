import React, { useState } from 'react';
import { useWorkspace } from './context/WorkspaceContext';
import AuthView from './views/AuthView';
import DashboardLayout from './components/DashboardLayout';
import TicketHub from './components/TicketHub';
import ReviewConsole from './components/ReviewConsole';
import WorkspaceStatusPanel from './components/WorkspaceStatusPanel';
import ConnectionPanel from './components/ConnectionPanel';

export default function App() {
  const { token, activeWorkspace } = useWorkspace();
  const [currentDashboard, setCurrentDashboard] = useState('support'); // tracks 'support' or 'review' dashboard views

  // Global Context Security Route Shield Gate
  if (!token || !activeWorkspace) {
    return <AuthView />;
  }

  return (
    <DashboardLayout 
      currentDashboard={currentDashboard} 
      setCurrentDashboard={setCurrentDashboard}
    >
      {currentDashboard === 'support' ? (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Support Hub Dashboard</h2>
            <p className="text-slate-400 text-xs mt-0.5 font-mono">BOLA-protected multi-tenant operational ticket interface.</p>
          </div>
          
          {/* Status & Connection Headers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
      ) : (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Review & Audit Console (Dashboard 2)</h2>
            <p className="text-slate-400 text-xs mt-0.5 font-mono">N-approval governance matrices and cryptographic audit trails.</p>
          </div>
          <ReviewConsole />
        </div>
      )}
    </DashboardLayout>
  );
}