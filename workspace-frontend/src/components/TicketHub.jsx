import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

export default function TicketHub() {
  const { activeWorkspace, authenticatedFetch } = useWorkspace();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' or 'details'

  // Form states for creating a ticket
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetOrgId, setTargetOrgId] = useState(''); // for cross-org sharing
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch all tickets matching the active workspace tenant
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/v1/tickets');
      if (response.ok) {
        const data = await response.json();
        const allTickets = [
          ...(data.nativeTickets || []),
          ...(data.sharedTickets || [])
        ];
        setTickets(allTickets);
      }
    } catch (err) {
      console.error('Failed to query ticket assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    setSelectedTicket(null);
    setMobileView('list');
  }, [activeWorkspace]);

  // Handle ticket submission
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const response = await authenticatedFetch('/api/v1/tickets', {
        method: 'POST',
        body: JSON.stringify({ title, description }),
      });
      if (response.ok) {
        setTitle('');
        setDescription('');
        setShowCreateModal(false);
        fetchTickets();
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
    }
  };

  // Select a ticket to view comments and details
  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setMobileView('details');
    try {
      const response = await authenticatedFetch(`/api/v1/tickets/${ticket.id}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error('Failed to fetch ticket details:', err);
    }
  };

  // Submit a comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await authenticatedFetch(`/api/v1/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment }),
      });
      if (response.ok) {
        const freshComment = await response.json();
        setComments([...comments, freshComment]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to append comment log:', err);
    }
  };

  // Share ticket with an external partner organization
  const handleShareTicket = async (e) => {
    e.preventDefault();
    if (!targetOrgId.trim()) return;

    try {
      const response = await authenticatedFetch(`/api/v1/tickets/${selectedTicket.id}/share`, {
        method: 'POST',
        body: JSON.stringify({ targetOrgId }),
      });
      if (response.ok) {
        alert('Ticket successfully aligned and shared with partner workspace!');
        setTargetOrgId('');
      } else {
        const errData = await response.json();
        alert(`Sharing failed: ${errData.error}`);
      }
    } catch (err) {
      console.error('Failed to execute cross-org share operation:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      {/* Left 1 Column: Ticket Streams & Management */}
      <div className={`lg:col-span-1 space-y-4 ${mobileView === 'list' ? 'block' : 'hidden lg:block'}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Workspace Tickets</h3>
          {activeWorkspace?.role !== 'GUEST' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white shadow transition-all"
            >
              + File Ticket
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-xs text-slate-500 font-mono">Syncing streaming queues...</div>
        ) : tickets.length === 0 ? (
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-850 text-xs text-slate-500 text-center">
            No active tickets matching this tenant matrix.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => handleSelectTicket(ticket)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedTicket?.id === ticket.id
                    ? 'bg-indigo-950/30 border-indigo-500/50 shadow-md shadow-indigo-600/5'
                    : 'bg-slate-900 border-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-xs font-bold text-white truncate">{ticket.title}</h4>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                    ticket.status === 'OPEN' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/60' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {ticket.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right 2 Columns: Inspection Board Panel */}
      <div className={`lg:col-span-2 ${mobileView === 'details' ? 'block' : 'hidden lg:block'}`}>
        {selectedTicket ? (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 space-y-6 min-h-[400px] flex flex-col justify-between">
            <div className="space-y-5">
              {/* Mobile Back Button */}
              <button
                onClick={() => setMobileView('list')}
                className="lg:hidden flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold mb-2 transition-colors w-fit"
              >
                ← Back to tickets
              </button>
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedTicket.title}</h2>
                  <span className="text-[10px] font-mono text-slate-500 block mt-0.5">ID: {selectedTicket.id}</span>
                </div>
                
                {/* Cross-Org Alignment Actions Panel */}
                {activeWorkspace?.role === 'ORG_ADMIN' && (
                  <form onSubmit={handleShareTicket} className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-850">
                    <input
                      type="text"
                      required
                      placeholder="Partner Org ID"
                      value={targetOrgId}
                      onChange={(e) => setTargetOrgId(e.target.value)}
                      className="bg-transparent text-[11px] px-2.5 focus:outline-none text-white w-32 font-mono"
                    />
                    <button type="submit" className="px-2.5 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700">
                      Share External
                    </button>
                  </form>
                )}
              </div>

              {/* Description Body */}
              <div className="text-xs text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-850 leading-relaxed">
                {selectedTicket.description}
              </div>

              {/* Interactive Comments Log Flow */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400">Activity & Feedback Log</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No notes committed to file yet.</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="text-xs bg-slate-950 p-3 rounded-xl border border-slate-850/60 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span className="text-indigo-400 font-medium">{comment.author?.email || comment.user?.email || 'System Agent'}</span>
                          <span>{new Date(comment.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{comment.content || comment.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Comment Insertion Input Form */}
            <form onSubmit={handleAddComment} className="border-t border-slate-800 pt-4 flex gap-3">
              <input
                type="text"
                placeholder="Append internal case note summary..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-850 text-xs rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-50 hover:text-indigo-950 font-bold text-xs rounded-xl text-white transition-all shadow"
              >
                Commit
              </button>
            </form>
          </div>
        ) : (
          <div className="h-full min-h-[400px] bg-slate-900 border border-slate-850 border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-500 font-mono text-xs p-6">
            🔮 Select an active tracking file from the stream queue to verify metadata layers.
          </div>
        )}
      </div>

      {/* Ticket Creation Modal Layer Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-scaleUp">
            <h3 className="text-base font-bold text-white">Log Operational Core Ticket</h3>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Case Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Memory leak inside worker thread context"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Diagnostic Details</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide system replication snapshots..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow"
                >
                  Dispatch Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}