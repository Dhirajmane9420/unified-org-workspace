import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import SharePRButton from './SharePRButton';

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

    const interval = setInterval(() => {
      fetchPullRequests();
      fetchAuditTimeline();
    }, 4000);

    return () => clearInterval(interval);
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
    <div className="space-y-8 animate-fadeIn">
      {/* Sub-Header Tabs Row */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('prs')}
          className={`pb-3.5 text-sm font-bold uppercase tracking-widest transition-all border-b-2 cursor-pointer ${
            activeTab === 'prs' 
              ? 'border-indigo-600 text-indigo-750' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Review Control Pipeline
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3.5 text-sm font-bold uppercase tracking-widest transition-all border-b-2 cursor-pointer ${
            activeTab === 'audit' 
              ? 'border-indigo-600 text-indigo-750' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Audit Ledger Analytics
        </button>
      </div>

      {activeTab === 'prs' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Code Stream Queue */}
          <div className={`lg:col-span-1 space-y-4 ${mobileView === 'list' ? 'block' : 'hidden lg:block'}`}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Pull Request Pipeline</h3>
            {pullRequests.length === 0 ? (
              <div className="p-6 bg-white rounded-2xl border border-slate-200 text-sm text-slate-400 text-center font-medium">
                No open engineering files listed.
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
                {pullRequests.map((pr) => (
                  <div
                    key={pr.id}
                    onClick={() => inspectPrDiff(pr)}
                    className={`p-5 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                      selectedPr?.id === pr.id 
                        ? 'bg-indigo-50/50 border-indigo-300 shadow-[0_4px_12px_-3px_rgba(79,70,229,0.08)] scale-[1.01] ring-1 ring-indigo-200/50' 
                        : 'bg-white border-slate-200 hover:border-slate-350 hover:shadow-xs hover:-translate-y-0.5'
                    }`}
                  >
                    <h4 className="text-sm sm:text-base font-bold text-slate-800 truncate">{pr.title}</h4>
                    <div className="flex justify-between items-center text-xs text-slate-500 mt-3 font-mono">
                      <span>Approvals: <strong className="text-indigo-650">{pr.reviewers?.filter(r => r.hasApproved).length || 0}</strong></span>
                      <span className="bg-slate-105 border border-slate-250 px-2.5 py-0.5 rounded-md text-[10px] uppercase tracking-widest font-bold text-slate-550">{pr.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Columns: Side-by-Side Snapshot Diff Component Context Block */}
          <div className={`lg:col-span-2 ${mobileView === 'details' ? 'block' : 'hidden lg:block'}`}>
            {selectedPr && diffData ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-7 space-y-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_25px_-2px_rgba(0,0,0,0.05)] transition-all duration-300">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setMobileView('list')}
                  className="lg:hidden flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-bold mb-3 transition-colors w-fit cursor-pointer"
                >
                  ← Back to PRs
                </button>
                <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-4 gap-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{selectedPr.title}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">Active Revision Checkpoint: {diffData.activeVersion}</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <SharePRButton 
                      pullRequestId={selectedPr.id}
                      ownerOrgId={selectedPr.organizationId}
                      onShareSuccess={fetchPullRequests}
                    />

                    {selectedPr.status !== 'MERGED' && (
                      <button
                        onClick={() => handleMergeAction(selectedPr.id)}
                        className="px-4.5 py-2.5 text-xs sm:text-sm font-bold bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-indigo-950 hover:to-indigo-900 text-white rounded-xl shadow-sm transition-all hover:-translate-y-0.5 active:scale-98 cursor-pointer"
                      >
                        Authorize Merge Action
                      </button>
                    )}
                  </div>
                </div>
                {/* PR Metadata Summary & N-Approval Governance Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-left">
                  {/* Left Side: Metadata summary */}
                  <div className="space-y-3.5 text-sm">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Author Profile</span>
                      <p className="font-bold text-slate-700 text-sm mt-0.5">{selectedPr.author?.email || 'External Contributor (GitHub Webhook)'}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Target & Origin Mappings</span>
                      <p className="font-mono text-xs text-indigo-750 bg-indigo-50/50 border border-indigo-100 px-2.5 py-1 rounded-md w-fit mt-1.5 font-semibold">
                        {diffData.stagedSource?.startsWith('Branch:') 
                          ? diffData.stagedSource.split('\n')[0].replace('Branch: ', '')
                          : 'test/webhook-pipeline → main'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Description</span>
                      <p className="text-slate-650 leading-relaxed text-xs mt-1 font-medium">{selectedPr.description || 'No description provided.'}</p>
                    </div>
                  </div>

                  {/* Right Side: N-Approval Governance Gate */}
                  <div className="p-4.5 bg-white border border-slate-250 rounded-2xl space-y-4 shadow-3xs text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">N-Approval Gate</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        (selectedPr.reviewers?.length > 0 && selectedPr.reviewers.every(r => r.hasApproved)) || selectedPr.status === 'MERGED' || (selectedPr.reviewers?.length === 0)
                          ? 'bg-emerald-50 text-emerald-650 border border-emerald-250'
                          : 'bg-amber-50 text-amber-650 border border-amber-250'
                      }`}>
                        {selectedPr.status === 'MERGED' || (selectedPr.reviewers?.length === 0) ? 'CLEARED' : 'PENDING APPROVAL'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Governance Threshold Clearance:</span>
                        <span>
                          {selectedPr.reviewers?.filter(r => r.hasApproved).length || 0} / {selectedPr.reviewers?.length || 1}
                        </span>
                      </div>
                      
                      {/* Threshold Meter Progress Bar */}
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/60 shadow-2xs">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            (selectedPr.reviewers?.length > 0 && selectedPr.reviewers.every(r => r.hasApproved)) || selectedPr.status === 'MERGED' || (selectedPr.reviewers?.length === 0)
                              ? 'bg-emerald-550'
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
                    <div className="space-y-2 text-xs">
                      <span className="text-slate-400 font-bold block font-mono text-[11px] uppercase tracking-wider">Reviewer Sign-offs Map:</span>
                      <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                        {selectedPr.reviewers && selectedPr.reviewers.length > 0 ? (
                          selectedPr.reviewers.map(r => (
                            <div key={r.id} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                              <span className="text-slate-700 font-bold text-xs font-mono">{r.reviewer?.email}</span>
                              <span className={`font-bold text-xs ${r.hasApproved ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {r.hasApproved ? 'Approved ✓' : 'Pending ⏳'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex justify-between items-center text-slate-550 font-mono py-1">
                            <span>SYSTEM_DAEMON (Webhook Triggered)</span>
                            <span className="text-emerald-650 font-bold">Approved ✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Core Text File Layout Map */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div>
                    <span className="text-xs font-bold text-slate-550 block mb-1.5 uppercase tracking-wider">Base Production String</span>
                    <pre className="p-4 bg-slate-50 text-slate-700 rounded-xl border border-slate-200 font-mono text-xs leading-relaxed overflow-x-auto min-h-28 whitespace-pre-wrap">
                      {diffData.baseSource || "// Initial workspace asset base state layer empty."}
                    </pre>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-700 block mb-1.5 uppercase tracking-wider">Staged Revision State</span>
                    <pre className="p-4 bg-indigo-50/15 text-indigo-950 rounded-xl border border-indigo-100/70 font-mono text-xs leading-relaxed overflow-x-auto min-h-28 whitespace-pre-wrap">
                      {diffData.stagedSource}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] bg-white border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-400 font-mono text-sm p-8 shadow-xs">
                🔮 Select an engineering file to calculate diff snapshots and check N-Approval gates.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab 2 Panel: Audit Timeline Streams + CSV Download Exporters */
        <div className="bg-white border border-slate-200 rounded-2xl p-7 space-y-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_25px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 text-[#121212]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2.5 bg-slate-55 p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Filter action (e.g. TICKET_CREATE)..."
                value={searchAction}
                onChange={(e) => setSearchAction(e.target.value)}
                className="bg-transparent text-sm px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none w-full sm:w-64 font-mono"
              />
              <button 
                onClick={fetchAuditTimeline}
                className="px-4 py-2 text-sm font-bold bg-white hover:bg-slate-50 border border-slate-350 text-slate-700 rounded-lg shadow-3xs cursor-pointer"
              >
                Query
              </button>
            </div>

            <button
              onClick={handleCsvExport}
              className="px-5 py-3 text-sm font-bold bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-indigo-950 hover:to-indigo-900 text-white rounded-xl transition-all shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center cursor-pointer hover:-translate-y-0.5"
            >
              📥 Export Tabular CSV Ledger
            </button>
          </div>

          {loading ? (
            <div className="text-sm font-mono text-slate-400 py-8 text-center">Reassembling decentralized activity records...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-sm text-slate-400 py-10 text-center font-mono">No matching system change mutations tracked inside this index parameters.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold tracking-wide">
                    <th className="p-4 text-xs uppercase">Timestamp</th>
                    <th className="p-4 text-xs uppercase">Operator / User</th>
                    <th className="p-4 text-xs uppercase font-mono">Mutation Event ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {auditLogs.map((log) => (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedAuditLog(log)}
                      className="hover:bg-slate-50 text-slate-800 font-medium transition-colors cursor-pointer"
                    >
                      <td className="p-4 font-mono text-xs text-slate-450 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-4 font-bold text-slate-800">{log.user?.email || 'SYSTEM_DAEMON'}</td>
                      <td className="p-4"><span className="px-2.5 py-1 rounded-md font-mono text-xs bg-indigo-50 text-indigo-750 border border-indigo-150/60 font-bold">{log.actionType}</span></td>
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
          <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedAuditLog(null)}></div>
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl p-8 flex flex-col border-l border-slate-250 animate-slideOver text-[#121212] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="font-extrabold text-base text-slate-800 uppercase tracking-widest">Ledger Event Details</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">{selectedAuditLog.id}</p>
              </div>
              <button 
                onClick={() => setSelectedAuditLog(null)}
                className="text-slate-450 hover:text-slate-800 text-sm font-extrabold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-6 flex-1 text-left">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Action Type</span>
                <span className="px-2.5 py-1.5 rounded-lg font-mono text-xs bg-indigo-50 text-indigo-700 border border-indigo-150/50 font-bold">
                  {selectedAuditLog.actionType}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Timestamp</span>
                <p className="text-sm font-bold text-slate-700">{new Date(selectedAuditLog.createdAt).toLocaleString()}</p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Operator Identity</span>
                <p className="text-sm font-bold text-slate-800">{selectedAuditLog.user?.email || 'SYSTEM_DAEMON'}</p>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2.5 font-mono">Raw Cryptographic Metadata</span>
                <pre className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-650 leading-relaxed shadow-inner overflow-x-auto max-h-[350px]">
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