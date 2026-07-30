import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ChevronDown, Plus, CheckCircle2 } from 'lucide-react';

export default function DashboardLayout({ children, currentDashboard, setCurrentDashboard }) {
  const { 
    activeWorkspace, 
    availableWorkspaces, 
    switchWorkspace, 
    logoutUser, 
    authenticatedFetch 
  } = useWorkspace();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
    <div className="min-h-screen bg-[#FAF9F6] text-[#121212] font-sans flex flex-col selection:bg-indigo-100">
      
      {/* Top Persistent Header */}
      <header className="bg-[#FAF9F6]/80 backdrop-blur-md border-b border-zinc-200/40 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#121212] flex items-center justify-center">
              <span className="text-[#FAF9F6] font-black text-xs font-sans">Ω</span>
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#121212]">
              Unified Console
            </span>
          </div>

          {/* Segmented Control Dashboard Switcher Links - Hidden on Mobile */}
          <nav className="hidden md:flex items-center bg-zinc-200/50 p-0.5 rounded-lg border border-zinc-200/30">
            <button
              onClick={() => setCurrentDashboard('support')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                currentDashboard === 'support'
                  ? 'bg-white text-[#121212] shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Support Hub
            </button>
            
            <button
              onClick={() => setCurrentDashboard('review')}
              disabled={activeWorkspace?.role === 'SUPPORT_AGENT'}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                activeWorkspace?.role === 'SUPPORT_AGENT' 
                  ? 'opacity-30 cursor-not-allowed text-zinc-400' 
                  : currentDashboard === 'review'
                    ? 'bg-white text-[#121212] shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
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
              className="p-2 rounded-lg bg-white border border-zinc-200/60 text-zinc-500 hover:text-zinc-800 relative transition-colors cursor-pointer"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-rose-600 text-[9px] font-black flex items-center justify-center text-white ring-2 ring-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-zinc-200/60 rounded-xl shadow-xl shadow-zinc-200/30 p-4 space-y-3 z-50 max-h-96 overflow-y-auto">
                <h4 className="text-xs font-bold border-b border-zinc-100 pb-2 flex justify-between items-center text-zinc-855">
                  <span>AI Operational Overview</span>
                  <span className="text-[9px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 font-semibold">Asynchronous</span>
                </h4>
                {notifications.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 text-center py-4">No recent background summaries calculated.</p>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="text-xs bg-zinc-50/60 p-3 rounded-lg border border-zinc-200/30 space-y-1">
                      <p className="text-zinc-700 leading-relaxed font-medium">
                        {notif.metadata?.digestSnapshot || "Workspace metric batch compilation complete."}
                      </p>
                      <span className="text-[10px] font-mono text-zinc-400 block">
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
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-white border border-zinc-200/80 rounded-lg shadow-sm hover:bg-zinc-50 transition-all text-xs font-semibold cursor-pointer"
              >
                <span className="bg-indigo-50 text-indigo-600 font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  {activeWorkspace?.role}
                </span>
                <span className="text-zinc-800 font-bold">{activeWorkspace?.orgName}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Expanded Dropdown Options Drawer Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-zinc-200/85 rounded-xl shadow-xl py-1.5 animate-fadeIn z-50">
                  <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                    Switch Node Context
                  </div>
                  
                  {/* Maps existing active user organizations */}
                  {availableWorkspaces.map((org) => (
                    <button
                      key={org.organizationId}
                      onClick={() => {
                        switchWorkspace(org.organizationId);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${org.organizationId === activeWorkspace?.organizationId ? 'bg-indigo-50/60 text-indigo-600' : 'text-zinc-700 hover:bg-zinc-50'}`}
                    >
                      {org.orgName}
                      {org.organizationId === activeWorkspace?.organizationId && <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>
                  ))}

                  <div className="border-t border-zinc-100 my-1.5"></div>

                  <button
                    onClick={() => {
                      setCurrentDashboard('create-workspace');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50/40 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    Initialize New Workspace
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={logoutUser}
              className="text-xs font-semibold bg-white hover:bg-rose-50 hover:text-rose-600 text-zinc-600 px-3 py-2 rounded-lg transition-all border border-zinc-200 shadow-sm cursor-pointer"
            >
              Logout
            </button>
          </div>

          {/* Hamburger Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg bg-white border border-zinc-200/60 text-zinc-500 hover:text-zinc-800 transition-colors md:hidden cursor-pointer"
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
        <div className="md:hidden bg-white border-b border-zinc-200 p-4 space-y-4 sticky top-16 z-40 shadow-xl">
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono pl-1">Switch Dashboard</span>
            <div className="grid grid-cols-2 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/50">
              <button
                onClick={() => setCurrentDashboard('support')}
                className={`py-2 rounded-md text-xs font-semibold tracking-wide transition-all text-center cursor-pointer ${
                  currentDashboard === 'support'
                    ? 'bg-white text-[#121212] shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Support Hub
              </button>
              <button
                onClick={() => setCurrentDashboard('review')}
                disabled={activeWorkspace?.role === 'SUPPORT_AGENT'}
                className={`py-2 rounded-md text-xs font-semibold tracking-wide transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeWorkspace?.role === 'SUPPORT_AGENT' 
                    ? 'opacity-30 cursor-not-allowed text-zinc-400' 
                    : currentDashboard === 'review'
                      ? 'bg-white text-[#121212] shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Review Console {activeWorkspace?.role === 'SUPPORT_AGENT' && '🔒'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono pl-1">Active Workspace ({activeWorkspace?.role})</span>
            <div className="flex items-center bg-white border border-zinc-200/60 rounded-lg px-3.5 py-2.5">
              <select
                value={activeWorkspace?.organizationId || ''}
                onChange={(e) => switchWorkspace(e.target.value)}
                className="bg-transparent text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer w-full border-0 font-sans"
              >
                {availableWorkspaces.map((workspace) => (
                  <option 
                    key={workspace.organizationId} 
                    value={workspace.organizationId} 
                    className="bg-white text-zinc-800 text-xs"
                  >
                    {workspace.orgName}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setCurrentDashboard('create-workspace');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50/40 flex items-center gap-2 transition-colors cursor-pointer border border-zinc-200/80 rounded-lg bg-white mt-1"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Initialize New Workspace
            </button>
          </div>

          <button
            onClick={logoutUser}
            className="w-full py-2.5 text-xs font-semibold bg-white hover:bg-rose-50 hover:text-rose-600 text-zinc-600 rounded-lg transition-all border border-zinc-200 shadow-sm cursor-pointer"
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