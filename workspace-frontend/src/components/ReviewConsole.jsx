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
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);

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
      const response = await authenticatedFetch(`/api/v1/pull-requests/${pr.id}/diff?targetVersion=${pr.currentVersion}`);
      if (response.ok) {
        const data = await response.json();
        setDiffData({
          activeVersion: data.comparingVersion,
          baseSource: data.diffView.previousDiffText || '// Initial workspace asset base state layer empty.',
          stagedSource: data.diffView.currentDiffText
        });
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
      const BASE_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${BASE_URL}/api/v1/audit-logs/export`, {
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
      <div className="flex border-b border-zinc-200 gap-4">
        <button
          onClick={() => setActiveTab('prs')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'prs' ? 'border-[#121212] text-[#121212]' : 'border-transparent text-zinc-400 hover:text-zinc-700'
          }`}
        >
          Review Control Pipeline
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'audit' ? 'border-[#121212] text-[#121212]' : 'border-transparent text-zinc-400 hover:text-zinc-700'
          }`}
        >
          Audit Ledger Analytics
        </button>
      </div>

      {activeTab === 'prs' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Code Stream Queue */}
          <div className={`lg:col-span-1 space-y-3 ${mobileView === 'list' ? 'block' : 'hidden lg:block'}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-550">Pull Request Pipeline</h3>
            {pullRequests.length === 0 ? (
              <div className="p-4 bg-white rounded-xl border border-zinc-200/50 text-xs text-zinc-450 text-center">
                No open engineering files listed.
              </div>
            ) : (
              pullRequests.map((pr) => (
                <div
                  key={pr.id}
                  onClick={() => inspectPrDiff(pr)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedPr?.id === pr.id ? 'bg-indigo-50/40 border-indigo-200 shadow-sm' : 'bg-white border-zinc-200/50 hover:border-zinc-300'
                  }`}
                >
                  <h4 className="text-xs font-bold text-zinc-800 truncate">{pr.title}</h4>
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-2 font-mono">
                    <span>Approvals: <strong className="text-indigo-600">{pr.reviewers?.filter(r => r.hasApproved).length || 0}</strong></span>
                    <span className="bg-zinc-100 border border-zinc-200/50 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide font-semibold text-zinc-500">{pr.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Columns: Side-by-Side Snapshot Diff Component Context Block */}
          <div className={`lg:col-span-2 ${mobileView === 'details' ? 'block' : 'hidden lg:block'}`}>
            {selectedPr && diffData ? (
              <div className="bg-white border border-zinc-200/50 rounded-xl p-5 space-y-4 shadow-sm">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setMobileView('list')}
                  className="lg:hidden flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold mb-2 transition-colors w-fit cursor-pointer"
                >
                  ← Back to PRs
                </button>
                <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-800">{selectedPr.title}</h3>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Active Revision Checkpoint: {diffData.activeVersion}</p>
                  </div>
                  {selectedPr.status !== 'MERGED' && (
                    <button
                      onClick={() => handleMergeAction(selectedPr.id)}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-[#121212] hover:bg-zinc-800 text-white rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      Authorize Merge Action
                    </button>
                  )}
                </div>
                {/* PR Metadata Summary & N-Approval Governance Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-50 border border-zinc-200/50 rounded-xl text-left">
                  {/* Left Side: Metadata summary */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">Author Profile</span>
                      <p className="font-semibold text-zinc-700">{selectedPr.author?.email || 'External Contributor (GitHub Webhook)'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">Target & Origin Mappings</span>
                      <p className="font-mono text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-1 rounded w-fit mt-1">
                        {diffData.stagedSource?.startsWith('Branch:') 
                          ? diffData.stagedSource.split('\n')[0].replace('Branch: ', '')
                          : 'test/webhook-pipeline → main'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">Description</span>
                      <p className="text-zinc-650 leading-relaxed text-[11px] mt-0.5">{selectedPr.description || 'No description provided.'}</p>
                    </div>
                  </div>

                  {/* Right Side: N-Approval Governance Gate */}
                  <div className="p-3 bg-white border border-zinc-200/80 rounded-xl space-y-3 shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">N-Approval Gate</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${
                        (selectedPr.reviewers?.length > 0 && selectedPr.reviewers.every(r => r.hasApproved)) || selectedPr.status === 'MERGED' || (selectedPr.reviewers?.length === 0)
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {selectedPr.status === 'MERGED' || (selectedPr.reviewers?.length === 0) ? 'CLEARED' : 'PENDING APPROVAL'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-zinc-700">
                        <span>Governance Threshold Clearance:</span>
                        <span>
                          {selectedPr.reviewers?.filter(r => r.hasApproved).length || 0} / {selectedPr.reviewers?.length || 1}
                        </span>
                      </div>
                      
                      {/* Threshold Meter Progress Bar */}
                      <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden border border-zinc-200/40">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            (selectedPr.reviewers?.length > 0 && selectedPr.reviewers.every(r => r.hasApproved)) || selectedPr.status === 'MERGED' || (selectedPr.reviewers?.length === 0)
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                          }`}
                          style={{
                            width: `${selectedPr.reviewers?.length > 0
                              ? ((selectedPr.reviewers.filter(r => r.hasApproved).length) / selectedPr.reviewers.length) * 100
                              : 100}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Reviewers sign-offs details */}
                    <div className="space-y-1 text-[10px]">
                      <span className="text-zinc-400 font-bold block font-mono">Reviewer Sign-offs Map:</span>
                      {selectedPr.reviewers && selectedPr.reviewers.length > 0 ? (
                        selectedPr.reviewers.map(r => (
                          <div key={r.id} className="flex justify-between items-center py-0.5 border-b border-zinc-100/50 last:border-0">
                            <span className="text-zinc-600 font-medium font-mono">{r.reviewer?.email}</span>
                            <span className={`font-bold ${r.hasApproved ? 'text-emerald-500' : 'text-zinc-400'}`}>
                              {r.hasApproved ? 'Approved ✓' : 'Pending ⏳'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between items-center text-zinc-550 font-mono">
                          <span>SYSTEM_DAEMON (Webhook Triggered)</span>
                          <span className="text-emerald-500 font-bold">Approved ✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Core Text File Layout Map */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-500 block mb-1 uppercase tracking-wide">Base Production String</span>
                    <pre className="p-3 bg-zinc-50 text-zinc-700 rounded-lg border border-zinc-200/50 font-mono text-[11px] overflow-x-auto min-h-24 whitespace-pre-wrap">
                      {diffData.baseSource || "// Initial workspace asset base state layer empty."}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-indigo-650 block mb-1 uppercase tracking-wide">Staged Revision State</span>
                    <pre className="p-3 bg-indigo-50/20 text-indigo-900 rounded-lg border border-indigo-100 font-mono text-[11px] overflow-x-auto min-h-24 whitespace-pre-wrap">
                      {diffData.stagedSource}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] bg-white border border-zinc-200 border-dashed rounded-xl flex flex-col items-center justify-center text-zinc-400 font-mono text-xs p-6 shadow-sm">
                🔮 Select an engineering file to calculate diff snapshots and check N-Approval gates.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab 2 Panel: Audit Timeline Streams + CSV Download Exporters */
        <div className="bg-white border border-zinc-200/50 rounded-xl p-5 space-y-4 shadow-sm text-[#121212]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-2 bg-zinc-50 p-1 rounded-lg border border-zinc-200/50 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Filter action (e.g. TICKET_CREATE)..."
                value={searchAction}
                onChange={(e) => setSearchAction(e.target.value)}
                className="bg-transparent text-xs px-3 py-1.5 text-[#121212] placeholder-zinc-400 focus:outline-none w-full sm:w-64 font-mono"
              />
              <button 
                onClick={fetchAuditTimeline}
                className="px-3.5 py-1.5 text-xs bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-600 rounded-lg transition-colors cursor-pointer"
              >
                Query
              </button>
            </div>

            <button
              onClick={handleCsvExport}
              className="px-4 py-2 text-xs font-semibold bg-[#121212] hover:bg-zinc-800 text-white rounded-lg transition-all shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center cursor-pointer"
            >
              📥 Export Tabular CSV Ledger
            </button>
          </div>

          {loading ? (
            <div className="text-xs font-mono text-zinc-400 py-6 text-center">Reassembling decentralized activity records...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-xs text-zinc-400 py-8 text-center font-mono">No matching system change mutations tracked inside this index parameters.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold tracking-wide">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Operator / User</th>
                    <th className="p-3 font-mono">Mutation Event ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/40 bg-white">
                  {auditLogs.map((log) => (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedAuditLog(log)}
                      className="hover:bg-zinc-50/60 text-zinc-700 transition-colors cursor-pointer"
                    >
                      <td className="p-3 font-mono text-[11px] text-zinc-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-3 font-semibold text-zinc-850">{log.user?.email || 'SYSTEM_DAEMON'}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded font-mono text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-semibold">{log.actionType}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Slide-out Drawer for Audit Log Cryptographic Metadata */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-zinc-900/30 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedAuditLog(null)}></div>
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl p-6 flex flex-col animate-slideOver text-[#121212] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
              <div>
                <h3 className="font-bold text-sm text-zinc-800 uppercase tracking-wide">Ledger Event Details</h3>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{selectedAuditLog.id}</p>
              </div>
              <button 
                onClick={() => setSelectedAuditLog(null)}
                className="text-zinc-450 hover:text-zinc-800 text-xs font-bold font-sans cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-5 flex-1 text-left">
              <div>
                <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider block mb-1">Action Type</span>
                <span className="px-2.5 py-1 rounded font-mono text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold">
                  {selectedAuditLog.actionType}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider block mb-1">Timestamp</span>
                <p className="text-xs font-medium text-zinc-700">{new Date(selectedAuditLog.createdAt).toLocaleString()}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider block mb-1">Operator Identity</span>
                <p className="text-xs font-semibold text-zinc-850">{selectedAuditLog.user?.email || 'SYSTEM_DAEMON'}</p>
              </div>

              <div className="border-t border-zinc-100 pt-4">
                <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider block mb-2 font-mono">Raw Cryptographic Metadata</span>
                <pre className="p-4 bg-zinc-50 border border-zinc-200/60 rounded-xl text-[10px] font-mono text-zinc-650 overflow-x-auto whitespace-pre-wrap max-h-[350px]">
                  {JSON.stringify(selectedAuditLog.metadata, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideOver {
          0% { transform: translateX(100%); }
          100% { transform: translateX(0); }
        }
        .animate-slideOver {
          animation: slideOver 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}