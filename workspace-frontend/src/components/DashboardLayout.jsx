import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

export default function DashboardLayout({ children, currentDashboard, setCurrentDashboard }) {
  const { 
    activeWorkspace, 
    availableWorkspaces, 
    switchWorkspace, 
    logoutUser, 
    authenticatedFetch 
  } = useWorkspace();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll for background AI digests cached by the cron job to feed the notification bell
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await authenticatedFetch('/api/v1/audit-logs?actionType=SYSTEM_AI_DIGEST_CRON&limit=5');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.timelineEvents || []);
          setUnreadCount(data.timelineEvents?.length || 0);
        }
      } catch (err) {
        console.error('Failed to sync background notification streams:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every 60 seconds
    return () => clearInterval(interval);
  }, [activeWorkspace]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentDashboard, activeWorkspace]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Persistent Header */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800/60 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-indigo-600/10">
              Ω
            </div>
            <span className="font-bold tracking-tight text-sm bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Unified Console
            </span>
          </div>

          {/* Segmented Control Dashboard Switcher Links - Hidden on Mobile */}
          <nav className="hidden md:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-850">
            <button
              onClick={() => setCurrentDashboard('support')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                currentDashboard === 'support'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Support Hub
            </button>
            
            <button
              onClick={() => setCurrentDashboard('review')}
              disabled={activeWorkspace?.role === 'SUPPORT_AGENT'}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 ${
                activeWorkspace?.role === 'SUPPORT_AGENT' 
                  ? 'opacity-30 cursor-not-allowed text-slate-500' 
                  : currentDashboard === 'review'
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/10'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Review Console {activeWorkspace?.role === 'SUPPORT_AGENT' && '🔒'}
            </button>
          </nav>
        </div>

        {/* Global Controls Panel Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* AI Progress Tracker Bell Panel Notification System */}
          <div className="relative">
            <button 
              onClick={() => { setShowNotifications(!showNotifications); setUnreadCount(0); }}
              className="p-2 rounded-xl bg-slate-950 border border-slate-850 text-slate-400 hover:text-white relative transition-colors"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-rose-600 text-[9px] font-black flex items-center justify-center text-white ring-2 ring-slate-900 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 space-y-3 z-50 max-h-96 overflow-y-auto ring-1 ring-black/20">
                <h4 className="text-xs font-bold border-b border-slate-800 pb-2 flex justify-between items-center text-white">
                  <span>AI Operational Overview</span>
                  <span className="text-[9px] font-mono bg-indigo-950 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-900/60">Asynchronous</span>
                </h4>
                {notifications.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-4">No recent background summaries calculated.</p>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="text-xs bg-slate-950 p-3 rounded-lg border border-slate-850/60 space-y-1">
                      <p className="text-slate-300 leading-relaxed font-medium">
                        {notif.metadata?.digestSnapshot || "Workspace metric batch compilation complete."}
                      </p>
                      <span className="text-[10px] font-mono text-slate-500 block">
                        {new Date(notif.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Desktop Controls - Hidden on Mobile */}
          <div className="hidden md:flex items-center gap-4">
            {/* Core Multi-Tenant Workspace Switcher Dropdown */}
            <div className="flex items-center bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 gap-2.5">
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-900/60 font-semibold">
                {activeWorkspace?.role}
              </span>
              <select
                value={activeWorkspace?.organizationId || ''}
                onChange={(e) => switchWorkspace(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-1"
              >
                {availableWorkspaces.map((workspace) => (
                  <option 
                    key={workspace.organizationId} 
                    value={workspace.organizationId} 
                    className="bg-slate-900 text-white text-xs"
                  >
                    {workspace.orgName}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={logoutUser}
              className="text-xs font-semibold bg-slate-850 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 px-3 py-2 rounded-xl transition-all border border-slate-750 hover:border-rose-900/60"
            >
              Logout
            </button>
          </div>

          {/* Hamburger Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-950 border border-slate-850 text-slate-400 hover:text-white transition-colors md:hidden"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-4 animate-slideDown sticky top-16 z-40 shadow-xl">
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono pl-1">Switch Dashboard</span>
            <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-850">
              <button
                onClick={() => setCurrentDashboard('support')}
                className={`py-2 rounded-lg text-xs font-semibold tracking-wide transition-all text-center ${
                  currentDashboard === 'support'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Support Hub
              </button>
              <button
                onClick={() => setCurrentDashboard('review')}
                disabled={activeWorkspace?.role === 'SUPPORT_AGENT'}
                className={`py-2 rounded-lg text-xs font-semibold tracking-wide transition-all text-center flex items-center justify-center gap-1.5 ${
                  activeWorkspace?.role === 'SUPPORT_AGENT' 
                    ? 'opacity-30 cursor-not-allowed text-slate-500' 
                    : currentDashboard === 'review'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Review Console {activeWorkspace?.role === 'SUPPORT_AGENT' && '🔒'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono pl-1">Active Workspace ({activeWorkspace?.role})</span>
            <div className="flex items-center bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5">
              <select
                value={activeWorkspace?.organizationId || ''}
                onChange={(e) => switchWorkspace(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer w-full"
              >
                {availableWorkspaces.map((workspace) => (
                  <option 
                    key={workspace.organizationId} 
                    value={workspace.organizationId} 
                    className="bg-slate-900 text-white text-xs"
                  >
                    {workspace.orgName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={logoutUser}
            className="w-full py-2.5 text-xs font-semibold bg-slate-850 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 rounded-xl transition-all border border-slate-750 hover:border-rose-900/60"
          >
            Logout Session
          </button>
        </div>
      )}

      {/* Main Dynamic Workspace Canvas Layout View */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}