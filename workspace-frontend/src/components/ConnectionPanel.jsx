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
      <div className="bg-white border border-zinc-200/50 rounded-xl p-5 shadow-sm flex flex-col items-center text-center space-y-3">
        <div className="text-3xl">🔒</div>
        <h3 className="text-sm font-bold text-[#121212] uppercase tracking-wider">Administrative Alignment</h3>
        <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
          Cross-organization connection channels are restricted. Please contact your workspace administrator to initiate partnership links.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200/50 rounded-xl p-5 shadow-sm space-y-6">
      <div className="border-b border-zinc-100 pb-3 flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Cross-Org Connections</h3>
        <span className="text-[9px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 font-semibold">Gatekeeper</span>
      </div>

      {/* Connection dispatch form */}
      <form onSubmit={handleRequestConnection} className="space-y-2">
        <label className="text-[11px] font-semibold text-zinc-500 pl-1 block">Request Partner Workspace Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            required
            value={targetOrgId}
            onChange={(e) => setTargetOrgId(e.target.value)}
            placeholder="Enter Partner Organization ID..."
            className="flex-1 bg-zinc-50 border border-zinc-200/60 text-xs rounded-lg px-3 py-2 text-[#121212] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-[#121212] hover:bg-zinc-800 disabled:opacity-40 text-[#FAF9F6] font-semibold text-xs rounded-lg transition-all shadow-sm cursor-pointer"
          >
            Connect
          </button>
        </div>
      </form>

      {/* Inbound Pending requests list */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-zinc-550">Inbound Requests</h4>
        {loading && connections.inboundPending.length === 0 ? (
          <div className="text-[10px] font-mono text-zinc-400 pl-1">Syncing alignment indexes...</div>
        ) : connections.inboundPending.length === 0 ? (
          <p className="text-[11px] text-zinc-400 italic pl-1">No pending inbound requests.</p>
        ) : (
          <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
            {connections.inboundPending.map((conn) => (
              <div key={conn.id} className="bg-zinc-50/60 border border-zinc-200/30 rounded-lg p-3 flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-zinc-800 truncate block">{conn.initiatorOrg?.name}</span>
                  <span className="text-[9px] font-mono text-zinc-400 truncate block">ID: {conn.initiatorOrgId}</span>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(conn.id)}
                    disabled={actionLoading !== null}
                    className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRevoke(conn.id)}
                    disabled={actionLoading !== null}
                    className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-white hover:bg-rose-50 hover:text-rose-600 text-zinc-500 rounded-md transition-colors border border-zinc-200 cursor-pointer"
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
      <div className="space-y-2.5 pt-2 border-t border-zinc-100">
        <h4 className="text-xs font-bold text-zinc-550">Active Partners</h4>
        {connections.activeConnections.length === 0 ? (
          <p className="text-[11px] text-zinc-400 italic pl-1">No active partner channels.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {connections.activeConnections.map((conn) => {
              const partner = conn.initiatorOrgId === activeWorkspace.organizationId ? conn.targetOrg : conn.initiatorOrg;
              return (
                <div key={conn.id} className="bg-zinc-50/60 border border-zinc-200/30 rounded-lg p-3 flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-zinc-800 truncate block">{partner?.name}</span>
                    <span className="text-[9px] font-mono text-zinc-400 truncate block">ID: {partner?.id}</span>
                  </div>
                  <button
                    onClick={() => handleRevoke(conn.id)}
                    disabled={actionLoading !== null}
                    className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-white hover:bg-rose-50 hover:text-rose-600 text-zinc-500 rounded-md transition-colors border border-zinc-200 flex-shrink-0 cursor-pointer"
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
