import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

export default function WorkspaceStatusPanel() {
  const { activeWorkspace, user, authenticatedFetch } = useWorkspace();
  const [apiHealth, setApiHealth] = useState('checking'); // 'checking', 'healthy', 'unhealthy'
  const [lastCheck, setLastCheck] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await authenticatedFetch('/health');
        if (response.ok) {
          const data = await response.json();
          setApiHealth(data.status === 'healthy' ? 'healthy' : 'unhealthy');
          setLastCheck(new Date().toLocaleTimeString());
        } else {
          setApiHealth('unhealthy');
        }
      } catch (err) {
        setApiHealth('unhealthy');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [activeWorkspace]);

  const copyOrgId = () => {
    if (activeWorkspace?.organizationId) {
      navigator.clipboard.writeText(activeWorkspace.organizationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_25px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 animate-fadeIn">
      {/* Col 1: Active Workspace Metadata */}
      <div className="space-y-2 flex flex-col justify-start">
        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Operational Tenant</span>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-[220px]" title={activeWorkspace?.orgName}>
            {activeWorkspace?.orgName || 'Loading Workspace...'}
          </h3>
          <span className="text-[10px] font-mono text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100/60 font-bold shadow-2xs">
            {activeWorkspace?.role}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-mono text-slate-500 truncate max-w-[180px]" title={activeWorkspace?.organizationId}>
            ID: {activeWorkspace?.organizationId || 'N/A'}
          </span>
          {activeWorkspace?.organizationId && (
            <button
              onClick={copyOrgId}
              className="px-2 py-0.5 bg-slate-55 hover:bg-slate-100 hover:border-slate-350 rounded-md text-slate-650 hover:text-indigo-955 transition-all text-xs font-semibold border border-slate-200 cursor-pointer active:scale-95 flex items-center gap-1 shadow-3xs"
              title="Copy Org ID"
            >
              {copied ? '✓' : '📋'} {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {/* Col 2: Active User Identity Context */}
      <div className="space-y-2 flex flex-col justify-start border-t border-slate-100 pt-5 md:pt-0 md:border-t-0 md:border-x md:border-slate-200/50 md:px-8">
        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Security Context</span>
        <span className="text-sm sm:text-base font-bold text-slate-800 truncate block" title={user?.email}>
          {user?.email || 'System Operator'}
        </span>
        <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
          🔑 Single Identity Shield Active
        </span>
      </div>

      {/* Col 3: Live System Health Monitor */}
      <div className="space-y-2 flex flex-col justify-start border-t border-slate-100 pt-5 md:pt-0 md:border-t-0">
        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest block">API Operational Status</span>
        <div className="flex items-center gap-3 mt-1">
          <div className="relative flex h-3 w-3 items-center justify-center">
            {apiHealth === 'healthy' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-455 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              apiHealth === 'healthy' 
                ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' 
                : apiHealth === 'unhealthy' 
                  ? 'bg-rose-500 shadow-md shadow-rose-500/20 animate-pulse' 
                  : 'bg-amber-500 animate-pulse'
            }`} />
          </div>
          <span className="text-sm sm:text-base font-bold text-slate-850">
            {apiHealth === 'healthy' ? 'Operational Status Healthy' : apiHealth === 'unhealthy' ? 'Unreachable Services' : 'Verifying Network...'}
          </span>
        </div>
        <span className="text-xs font-mono text-slate-500 block mt-1">
          {lastCheck ? `Last Verification: ${lastCheck}` : 'Polling operational matrices...'}
        </span>
      </div>
    </div>
  );
}

