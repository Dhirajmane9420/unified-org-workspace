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
    <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 sm:p-5 shadow-lg grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 animate-fadeIn">
      {/* Col 1: Active Workspace Metadata */}
      <div className="space-y-1.5 flex flex-col justify-center">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Operational Tenant</span>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-white truncate max-w-[200px]">
            {activeWorkspace?.orgName || 'Loading Workspace...'}
          </h3>
          <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/60 font-black">
            {activeWorkspace?.role}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
            ID: {activeWorkspace?.organizationId || 'N/A'}
          </span>
          {activeWorkspace?.organizationId && (
            <button
              onClick={copyOrgId}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors text-[10px] font-semibold border border-transparent hover:border-slate-700"
              title="Copy Org ID"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          )}
        </div>
      </div>

      {/* Col 2: Active User Identity Context */}
      <div className="space-y-1 flex flex-col justify-center border-t border-slate-850/60 pt-3 md:pt-0 md:border-t-0 md:border-x md:border-slate-850/60 md:px-6">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Security Context</span>
        <span className="text-xs font-semibold text-slate-200 truncate block">
          {user?.email || 'System Operator'}
        </span>
        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
          🔑 Single Identity Shield Enabled
        </span>
      </div>

      {/* Col 3: Live System Health Monitor */}
      <div className="space-y-1 flex flex-col justify-center border-t border-slate-850/60 pt-3 md:pt-0 md:border-t-0">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">API Operational Status</span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`h-2 w-2 rounded-full ${
            apiHealth === 'healthy' 
              ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' 
              : apiHealth === 'unhealthy' 
                ? 'bg-rose-500 shadow-md shadow-rose-500/20 animate-pulse' 
                : 'bg-amber-500 animate-pulse'
          }`} />
          <span className="text-xs font-bold text-slate-200 capitalize">
            {apiHealth === 'healthy' ? 'Operational Status Healthy' : apiHealth === 'unhealthy' ? 'Unreachable Services' : 'Verifying Network...'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
          {lastCheck ? `Last Verification: ${lastCheck}` : 'Polling operational matrices...'}
        </span>
      </div>
    </div>
  );
}
