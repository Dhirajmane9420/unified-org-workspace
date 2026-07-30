import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

export default function ReviewConsole() {
  const { activeWorkspace, authenticatedFetch } = useWorkspace();
  const [pullRequests, setPullRequests] = useState([]);
  const [selectedPr, setSelectedPr] = useState(null);
  const [diffData, setDiffData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('prs'); // 'prs' or 'audit'
  const [mobileView, setMobileView] = useState('list'); // 'list' or 'details'

  // Audit Logs Filter Parameters
  const [searchAction, setSearchAction] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPullRequests();
    fetchAuditTimeline();
    setSelectedPr(null);
    setDiffData(null);
    setMobileView('list');
  }, [activeWorkspace]);

  // Query code items tied to workspace tenant matrix
  const fetchPullRequests = async () => {
    try {
      const response = await authenticatedFetch('/api/v1/pull-requests');
      if (response.ok) {
        const data = await response.json();
        setPullRequests(data);
      }
    } catch (err) {
      console.error('Failed to look up PR records:', err);
    }
  };

  // Pull global audit trail data matching security parameters
  const fetchAuditTimeline = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/v1/audit-logs?limit=50';
      if (searchAction.trim()) {
        endpoint += `&actionType=${searchAction.trim()}`;
      }
      const response = await authenticatedFetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.timelineEvents || []);
      }
    } catch (err) {
      console.error('Failed to query system log stream:', err);
    } finally {
      setLoading(false);
    }
  };

  // Inspect specific version snapshots using the diff viewer endpoint
  const inspectPrDiff = async (pr) => {
    setSelectedPr(pr);
    setMobileView('details');
    try {
      const response = await authenticatedFetch(`/api/v1/pull-requests/${pr.id}/diff`);
      if (response.ok) {
        const data = await response.json();
        setDiffData(data);
      }
    } catch (err) {
      console.error('Failed to map file diff details:', err);
    }
  };

  // Execute N-Approval change control gates to merge code assets
  const handleMergeAction = async (prId) => {
    try {
      const response = await authenticatedFetch(`/api/v1/pull-requests/${prId}/merge`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (!response.ok) {
        alert(`Merge Rejected: ${data.error || 'N-Approval validation failure.'}`);
      } else {
        alert('Verification success! Code changes successfully merged into trunk.');
        fetchPullRequests();
        setSelectedPr(null);
        setDiffData(null);
      }
    } catch (err) {
      console.error('Network failure executing change gate transaction:', err);
    }
  };

  // Stream structural tabular CSV raw content out to user download directories
  const handleCsvExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/audit-logs/export', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-active-org-id': activeWorkspace?.organizationId || ''
        }
      });

      if (!response.ok) throw new Error('Failed to generate audit dump stream');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${activeWorkspace?.orgName || 'tenant'}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Export failure: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sub-Header Tabs Row */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('prs')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'prs' ? 'border-purple-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Review Control Pipeline
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'audit' ? 'border-purple-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Audit Ledger Analytics
        </button>
      </div>

      {activeTab === 'prs' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Code Stream Queue */}
          <div className={`lg:col-span-1 space-y-3 ${mobileView === 'list' ? 'block' : 'hidden lg:block'}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pull Request Pipeline</h3>
            {pullRequests.length === 0 ? (
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-850 text-xs text-slate-500 text-center">
                No open engineering files listed.
              </div>
            ) : (
              pullRequests.map((pr) => (
                <div
                  key={pr.id}
                  onClick={() => inspectPrDiff(pr)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedPr?.id === pr.id ? 'bg-purple-950/20 border-purple-500/50' : 'bg-slate-900 border-slate-850 hover:border-slate-700'
                  }`}
                >
                  <h4 className="text-xs font-bold text-white truncate">{pr.title}</h4>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-mono">
                    <span>Approvals: <strong className="text-purple-400">{pr.approvals}</strong></span>
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide font-black">{pr.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Columns: Side-by-Side Snapshot Diff Component Context Block */}
          <div className={`lg:col-span-2 ${mobileView === 'details' ? 'block' : 'hidden lg:block'}`}>
            {selectedPr && diffData ? (
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-4">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setMobileView('list')}
                  className="lg:hidden flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold mb-2 transition-colors w-fit"
                >
                  ← Back to PRs
                </button>
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedPr.title}</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Active Revision Checkpoint: {diffData.activeVersion}</p>
                  </div>
                  {selectedPr.status !== 'MERGED' && (
                    <button
                      onClick={() => handleMergeAction(selectedPr.id)}
                      className="px-3 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow transition-all"
                    >
                      Authorize Merge Action
                    </button>
                  )}
                </div>

                {/* Side-by-Side Core Text File Layout Map */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wide">Base Production String</span>
                    <pre className="p-3 bg-slate-950 text-slate-400 rounded-xl border border-slate-850/60 font-mono text-[11px] overflow-x-auto min-h-24 whitespace-pre-wrap">
                      {diffData.baseSource || "// Initial workspace asset base state layer empty."}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 block mb-1 uppercase tracking-wide">Staged Revision State</span>
                    <pre className="p-3 bg-slate-950 text-purple-200/90 rounded-xl border border-purple-950 font-mono text-[11px] overflow-x-auto min-h-24 whitespace-pre-wrap">
                      {diffData.stagedSource}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] bg-slate-900 border border-slate-850 border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-500 font-mono text-xs p-6">
                🔮 Select an engineering file to calculate diff snapshots and check N-Approval gates.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab 2 Panel: Audit Timeline Streams + CSV Download Exporters */
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-850 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Filter action (e.g. TICKET_CREATE)..."
                value={searchAction}
                onChange={(e) => setSearchAction(e.target.value)}
                className="bg-transparent text-xs px-3 py-1.5 text-white placeholder-slate-600 focus:outline-none w-full sm:w-64 font-mono"
              />
              <button 
                onClick={fetchAuditTimeline}
                className="px-3 py-1.5 text-xs bg-slate-850 hover:bg-slate-800 font-bold rounded-lg text-slate-200 transition-colors border border-slate-750"
              >
                Query
              </button>
            </div>

            <button
              onClick={handleCsvExport}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              📥 Export Tabular CSV Ledger
            </button>
          </div>

          {loading ? (
            <div className="text-xs font-mono text-slate-500 py-6 text-center">Reassembling decentralized activity records...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center font-mono">No matching system change mutations tracked inside this index parameters.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-850">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-bold tracking-wide">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Operator / User</th>
                    <th className="p-3 font-mono">Mutation Event ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 bg-slate-900/40">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-850/20 text-slate-300">
                      <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-3 font-medium text-slate-200">{log.user?.email || 'SYSTEM_DAEMON'}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-950 text-purple-400 border border-slate-850 font-semibold">{log.actionType}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}