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

  const fetchConnections = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/v1/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (err) {
      console.error('Failed to retrieve connection contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
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
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg flex flex-col items-center text-center space-y-3">
        <div className="text-3xl">🔒</div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Administrative Alignment</h3>
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
          Cross-organization connection channels are restricted. Please contact your workspace administrator to initiate partnership links.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-6">
      <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Cross-Org Connections</h3>
        <span className="text-[9px] font-mono bg-purple-950 text-purple-400 px-1.5 py-0.5 rounded border border-purple-900/60 font-black">Gatekeeper</span>
      </div>

      {/* Connection dispatch form */}
      <form onSubmit={handleRequestConnection} className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-400 pl-1 block">Request Partner Workspace Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            required
            value={targetOrgId}
            onChange={(e) => setTargetOrgId(e.target.value)}
            placeholder="Enter Partner Organization ID..."
            className="flex-1 bg-slate-950 border border-slate-850 text-xs rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all shadow"
          >
            Connect
          </button>
        </div>
      </form>

      {/* Inbound Pending requests list */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-400">Inbound Requests</h4>
        {loading && connections.inboundPending.length === 0 ? (
          <div className="text-[10px] font-mono text-slate-600 pl-1">Syncing alignment indexes...</div>
        ) : connections.inboundPending.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic pl-1">No pending inbound requests.</p>
        ) : (
          <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
            {connections.inboundPending.map((conn) => (
              <div key={conn.id} className="bg-slate-950 border border-slate-850 rounded-xl p-3 flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white truncate block">{conn.initiatorOrg?.name}</span>
                  <span className="text-[9px] font-mono text-slate-500 truncate block">ID: {conn.initiatorOrgId}</span>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(conn.id)}
                    disabled={actionLoading !== null}
                    className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRevoke(conn.id)}
                    disabled={actionLoading !== null}
                    className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-850 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 rounded-lg transition-colors border border-slate-750"
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
      <div className="space-y-2.5 pt-2 border-t border-slate-800/60">
        <h4 className="text-xs font-bold text-slate-400">Active Partners</h4>
        {connections.activeConnections.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic pl-1">No active partner channels.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {connections.activeConnections.map((conn) => {
              const partner = conn.initiatorOrgId === activeWorkspace.organizationId ? conn.targetOrg : conn.initiatorOrg;
              return (
                <div key={conn.id} className="bg-slate-950 border border-slate-850 rounded-xl p-3 flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white truncate block">{partner?.name}</span>
                    <span className="text-[9px] font-mono text-slate-500 truncate block">ID: {partner?.id}</span>
                  </div>
                  <button
                    onClick={() => handleRevoke(conn.id)}
                    disabled={actionLoading !== null}
                    className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-850 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 rounded-lg transition-colors border border-slate-750 flex-shrink-0"
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
