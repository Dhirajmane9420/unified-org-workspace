import React, { useState, useEffect, useRef } from 'react';
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

  const notificationsRef = useRef(null);
  const workspaceSwitcherRef = useRef(null);

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

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (workspaceSwitcherRef.current && !workspaceSwitcherRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentDashboard, activeWorkspace]);

  return (
    <div className="min-h-screen bg-slate-50/60 text-[#121212] font-sans flex flex-col selection:bg-indigo-150 transition-colors">
      
      {/* Top Persistent Header */}
      <header className="bg-white/85 backdrop-blur-lg border-b border-slate-200/60 h-20 flex items-center justify-between px-6 sm:px-8 sticky top-0 z-50 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02),0_4px_6px_-2px_rgba(0,0,0,0.01)]">
        <div className="flex items-center gap-6 sm:gap-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-950 via-slate-900 to-violet-950 flex items-center justify-center shadow-md shadow-indigo-950/10">
              <span className="text-[#FAF9F6] font-black text-sm">Ω</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">
              Unified Console
            </span>
          </div>

          {/* Segmented Control Dashboard Switcher Links - Hidden on Mobile */}
          <nav className="hidden md:flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200/40 shadow-inner gap-1">
            <button
              onClick={() => setCurrentDashboard('support')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                currentDashboard === 'support'
                  ? 'bg-white text-indigo-950 shadow-sm border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              Support Hub
            </button>
            
            <button
              onClick={() => setCurrentDashboard('review')}
              disabled={activeWorkspace?.role === 'SUPPORT_AGENT'}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
                activeWorkspace?.role === 'SUPPORT_AGENT' 
                  ? 'opacity-40 cursor-not-allowed text-slate-400' 
                  : currentDashboard === 'review'
                    ? 'bg-white text-indigo-950 shadow-sm border border-slate-200/20'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              Review Console {activeWorkspace?.role === 'SUPPORT_AGENT' && '🔒'}
            </button>
          </nav>
        </div>

        {/* Global Controls Panel Section */}
        <div className="flex items-center gap-3 sm:gap-5">
          
          {/* AI Progress Tracker Bell Panel Notification System */}
          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={() => { setShowNotifications(!showNotifications); setUnreadCount(0); }}
              className="p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-55/10 text-slate-600 hover:text-slate-900 relative transition-all shadow-xs hover:shadow-sm cursor-pointer"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-600 text-[10px] font-black flex items-center justify-center text-white ring-2 ring-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4 z-50 max-h-[450px] overflow-y-auto animate-fadeIn">
                <h4 className="text-sm font-bold border-b border-slate-100 pb-3 flex justify-between items-center text-slate-800">
                  <span>AI Operational Overview</span>
                  <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100 font-bold">Asynchronous</span>
                </h4>
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No recent background summaries calculated.</p>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/50 space-y-1.5 hover:border-indigo-150 transition-colors">
                      <p className="text-slate-700 leading-relaxed font-semibold text-xs">
                        {notif.metadata?.digestSnapshot || "Workspace metric batch compilation complete."}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400 block font-medium">
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
          <div className="relative" ref={workspaceSwitcherRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3.5 px-4.5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-350 hover:shadow-sm transition-all text-xs font-semibold cursor-pointer"
              >
                <span className="bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-indigo-100 uppercase tracking-wider">
                  {activeWorkspace?.role}
                </span>
                <span className="text-slate-800 font-bold text-sm">{activeWorkspace?.orgName}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Expanded Dropdown Options Drawer Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 animate-fadeIn z-50">
                  <div className="px-4 py-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono border-b border-slate-100/60 mb-1">
                    Switch Node Context
                  </div>
                  
                  {/* Maps existing active user organizations */}
                  <div className="max-h-60 overflow-y-auto px-1 space-y-0.5">
                    {availableWorkspaces.map((org) => (
                      <button
                        key={org.organizationId}
                        onClick={() => {
                          switchWorkspace(org.organizationId);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          org.organizationId === activeWorkspace?.organizationId 
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/30' 
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate pr-2">{org.orgName}</span>
                        {org.organizationId === activeWorkspace?.organizationId && <CheckCircle2 className="w-4 h-4 stroke-[2.5] text-indigo-650 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 my-2"></div>

                  <div className="px-1">
                    <button
                      onClick={() => {
                        setCurrentDashboard('create-workspace');
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-indigo-750 hover:bg-indigo-50/50 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3] text-indigo-700" />
                      Initialize New Workspace
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={logoutUser}
              className="text-sm font-bold bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-250 text-slate-700 px-4.5 py-2.5 rounded-xl transition-all border border-slate-200 shadow-xs cursor-pointer active:scale-98"
            >
              Logout
            </button>
          </div>

          {/* Hamburger Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors md:hidden cursor-pointer"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-5 space-y-5 sticky top-20 z-40 shadow-2xl animate-slideDown">
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono pl-1">Switch Dashboard</span>
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
              <button
                onClick={() => setCurrentDashboard('support')}
                className={`py-3 rounded-lg text-sm font-bold tracking-wide transition-all text-center cursor-pointer ${
                  currentDashboard === 'support'
                    ? 'bg-white text-indigo-950 shadow-sm border border-slate-200/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Support Hub
              </button>
              <button
                onClick={() => setCurrentDashboard('review')}
                disabled={activeWorkspace?.role === 'SUPPORT_AGENT'}
                className={`py-3 rounded-lg text-sm font-bold tracking-wide transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${
                  activeWorkspace?.role === 'SUPPORT_AGENT' 
                    ? 'opacity-40 cursor-not-allowed text-slate-400' 
                    : currentDashboard === 'review'
                      ? 'bg-white text-indigo-950 shadow-sm border border-slate-200/20'
                      : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Review Console {activeWorkspace?.role === 'SUPPORT_AGENT' && '🔒'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono pl-1">Active Workspace ({activeWorkspace?.role})</span>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs">
              <select
                value={activeWorkspace?.organizationId || ''}
                onChange={(e) => switchWorkspace(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer w-full border-0 font-sans"
              >
                {availableWorkspaces.map((workspace) => (
                  <option 
                    key={workspace.organizationId} 
                    value={workspace.organizationId} 
                    className="bg-white text-slate-800 text-sm"
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
              className="w-full text-left px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50/40 flex items-center gap-2.5 transition-colors border border-slate-200 rounded-xl bg-white mt-1 shadow-xs"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              Initialize New Workspace
            </button>
          </div>

          <button
            onClick={logoutUser}
            className="w-full py-3.5 text-sm font-bold bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl transition-all border border-slate-200 shadow-sm cursor-pointer"
          >
            Logout Session
          </button>
        </div>
      )}

      {/* Main Dynamic Workspace Canvas Layout View */}
      <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto pb-16">
        {children}
      </main>
    </div>
  );
}