import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

export default function ConnectionPanel() {
  const { activeWorkspace, authenticatedFetch } = useWorkspace();
  const [targetOrgId, setTargetOrgId] = useState('');
  const [connections, setConnections] = useState({
    inboundPending: [],
    outboundPending: [],
    activeConnections: []
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // stores connectionId undergoing action

  const isAdmin = activeWorkspace?.role === 'ORG_ADMIN';

  const fetchConnections = async (silent = false) => {
    if (!isAdmin) return;
    if (!silent) setLoading(true);
    try {
      const response = await authenticatedFetch('/api/v1/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (err) {
      console.error('Failed to retrieve connection contracts:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const roleLabels = {
    ORG_ADMIN: 'Organization Administrator',
    SUPPORT_AGENT: 'Support Agent',
    REVIEWER: 'Reviewer',
    GUEST: 'Guest Access'
  };

  useEffect(() => {
    fetchConnections();

    const interval = setInterval(() => {
      fetchConnections(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeWorkspace]);


  const handleRequestConnection = async (e) => {
    e.preventDefault();
    if (!targetOrgId.trim()) return;

    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/v1/connections/request', {
        method: 'POST',
        body: JSON.stringify({ targetOrgId: targetOrgId.trim() })
      });
      const data = await response.json();
      if (response.ok) {
        alert('Cross-organization alignment request successfully dispatched!');
        setTargetOrgId('');
        fetchConnections();
      } else {
        alert(data.error || 'Failed to dispatch connection request');
      }
    } catch (err) {
      console.error('Connection request error:', err);
      alert('Network failure dispatching connection contract.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      const response = await authenticatedFetch(`/api/v1/connections/${id}/approve`, {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {
        alert('Workspace partnership channel approved successfully!');
        fetchConnections();
      } else {
        alert(data.error || 'Failed to approve partnership channel');
      }
    } catch (err) {
      console.error('Approve connection error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm('Are you sure you want to revoke/sever this connection contract? This will immediately terminate shared ticket data transfers.')) return;
    setActionLoading(id);
    try {
      const response = await authenticatedFetch(`/api/v1/connections/${id}/revoke`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok) {
        alert('Connection contract successfully severed.');
        fetchConnections();
      } else {
        alert(data.error || 'Failed to revoke connection contract');
      }
    } catch (err) {
      console.error('Revoke connection error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_25px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 flex flex-col items-center text-center space-y-4">
        <div className="text-4xl bg-slate-50 p-3 rounded-2xl border border-slate-150">🔒</div>
        <h3 className="text-base font-bold text-slate-800 uppercase tracking-widest">Administrative Alignment</h3>
        <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
          Cross-organization connection channels are restricted. You are registered as <strong className="text-indigo-650">{roleLabels[activeWorkspace?.role] || activeWorkspace?.role}</strong>. Please contact your workspace administrator to initiate partnership links.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_25px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 space-y-6">
      <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Cross-Org Connections</h3>
        <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md border border-indigo-100/60 font-bold">Gatekeeper</span>
      </div>

      {/* Connection dispatch form */}
      <form onSubmit={handleRequestConnection} className="space-y-3.5">
        <label className="text-xs font-bold text-slate-500 pl-0.5 block uppercase tracking-wider">Request Partner Workspace Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            required
            value={targetOrgId}
            onChange={(e) => setTargetOrgId(e.target.value)}
            placeholder="Enter Partner Organization ID..."
            className="flex-1 bg-slate-50 border border-slate-200 text-sm rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-indigo-950 hover:to-indigo-900 disabled:opacity-40 text-[#FAF9F6] font-bold text-sm rounded-xl hover:-translate-y-0.5 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            Connect
          </button>
        </div>
      </form>

      {/* Inbound Pending requests list */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Inbound Requests</h4>
        {loading && connections.inboundPending.length === 0 ? (
          <div className="text-xs font-mono text-slate-400 pl-0.5">Syncing alignment indexes...</div>
        ) : connections.inboundPending.length === 0 ? (
          <p className="text-xs text-slate-400 italic pl-0.5">No pending inbound requests.</p>
        ) : (
          <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
            {connections.inboundPending.map((conn) => (
              <div key={conn.id} className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex justify-between items-center gap-3 hover:border-slate-350 transition-colors shadow-2xs">
                <div className="min-w-0 space-y-0.5">
                  <span className="text-sm font-bold text-slate-800 truncate block">{conn.initiatorOrg?.name}</span>
                  <span className="text-[10px] font-mono text-slate-450 truncate block">ID: {conn.initiatorOrgId}</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(conn.id)}
                    disabled={actionLoading !== null}
                    className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-xs cursor-pointer hover:scale-102 active:scale-98"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRevoke(conn.id)}
                    disabled={actionLoading !== null}
                    className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-650 hover:border-rose-200 border border-slate-200 rounded-lg transition-all active:scale-98 cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active connections list */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Partners</h4>
        {connections.activeConnections.length === 0 ? (
          <p className="text-xs text-slate-400 italic pl-0.5">No active partner channels.</p>
        ) : (
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {connections.activeConnections.map((conn) => {
              const partner = conn.initiatorOrgId === activeWorkspace.organizationId ? conn.targetOrg : conn.initiatorOrg;
              return (
                <div key={conn.id} className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex justify-between items-center gap-3 hover:border-slate-350 transition-colors shadow-2xs">
                  <div className="min-w-0 space-y-0.5">
                    <span className="text-sm font-bold text-slate-800 truncate block">{partner?.name}</span>
                    <span className="text-[10px] font-mono text-slate-450 truncate block">ID: {partner?.id}</span>
                  </div>
                  <button
                    onClick={() => handleRevoke(conn.id)}
                    disabled={actionLoading !== null}
                    className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-650 hover:border-rose-200 border border-slate-200 rounded-lg transition-all active:scale-98 flex-shrink-0 cursor-pointer"
                  >
                    Sever
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
