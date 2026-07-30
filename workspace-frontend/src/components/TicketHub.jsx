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
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-550">Workspace Tickets</h3>
          {activeWorkspace?.role !== 'GUEST' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-1.5 text-xs font-semibold bg-[#121212] hover:bg-zinc-800 rounded-lg text-[#FAF9F6] shadow-sm cursor-pointer transition-all active:scale-[0.98]"
            >
              + File Ticket
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-xs text-zinc-400 font-mono">Syncing streaming queues...</div>
        ) : tickets.length === 0 ? (
          <div className="p-4 bg-white rounded-xl border border-zinc-200/50 text-xs text-zinc-400 text-center">
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
                    ? 'bg-indigo-50/40 border-indigo-200 shadow-sm'
                    : 'bg-white border-zinc-200/50 hover:border-zinc-300'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-xs font-bold text-zinc-800 truncate">{ticket.title}</h4>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                    ticket.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 line-clamp-2 mt-1 leading-relaxed">
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
          <div className="bg-white border border-zinc-200/50 rounded-xl p-6 space-y-6 min-h-[400px] flex flex-col justify-between shadow-sm">
            <div className="space-y-5">
              {/* Mobile Back Button */}
              <button
                onClick={() => setMobileView('list')}
                className="lg:hidden flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold mb-2 transition-colors w-fit cursor-pointer"
              >
                ← Back to tickets
              </button>
              <div className="flex justify-between items-start border-b border-zinc-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-zinc-850">{selectedTicket.title}</h2>
                  <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">ID: {selectedTicket.id}</span>
                </div>
                
                {/* Cross-Org Alignment Actions Panel */}
                {activeWorkspace?.role === 'ORG_ADMIN' && (
                  <form onSubmit={handleShareTicket} className="flex items-center gap-2 bg-zinc-50 p-1 rounded-lg border border-zinc-200/50">
                    <input
                      type="text"
                      required
                      placeholder="Partner Org ID"
                      value={targetOrgId}
                      onChange={(e) => setTargetOrgId(e.target.value)}
                      className="bg-transparent text-[11px] px-2.5 focus:outline-none text-[#121212] w-32 font-mono"
                    />
                    <button type="submit" className="px-2.5 py-1 text-[10px] font-semibold bg-white hover:bg-zinc-50 text-zinc-600 rounded border border-zinc-200 cursor-pointer transition-colors">
                      Share External
                    </button>
                  </form>
                )}
              </div>

              {/* Description Body */}
              <div className="text-xs text-zinc-700 bg-zinc-50/80 p-4 rounded-lg border border-zinc-200/40 leading-relaxed">
                {selectedTicket.description}
              </div>

              {/* Interactive Comments Log Flow */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-550">Activity & Feedback Log</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-[11px] text-zinc-400 italic">No notes committed to file yet.</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="text-xs bg-zinc-50/60 p-3 rounded-lg border border-zinc-200/30 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                          <span className="text-indigo-600 font-semibold">{comment.author?.email || comment.user?.email || 'System Agent'}</span>
                          <span>{new Date(comment.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-zinc-600 leading-relaxed">{comment.content || comment.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Comment Insertion Input Form */}
            <form onSubmit={handleAddComment} className="border-t border-zinc-100 pt-4 flex gap-3">
              <input
                type="text"
                placeholder="Append internal case note summary..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-zinc-50 border border-zinc-200/60 text-xs rounded-lg px-4 py-2.5 text-[#121212] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#121212] hover:bg-zinc-800 font-semibold text-xs rounded-lg text-white transition-all shadow-sm cursor-pointer"
              >
                Commit
              </button>
            </form>
          </div>
        ) : (
          <div className="h-full min-h-[400px] bg-white border border-zinc-200 border-dashed rounded-xl flex flex-col items-center justify-center text-zinc-400 font-mono text-xs p-6 shadow-sm">
            🔮 Select an active tracking file from the stream queue to verify metadata layers.
          </div>
        )}
      </div>

      {/* Ticket Creation Modal Layer Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-scaleUp text-[#121212]">
            <h3 className="text-base font-bold">Log Operational Core Ticket</h3>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-500">Case Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Memory leak inside worker thread context"
                  className="w-full bg-zinc-50 border border-zinc-200/60 rounded-lg px-3 py-2 text-xs text-[#121212] focus:outline-none focus:ring-2 focus:ring-zinc-250"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-500">Diagnostic Details</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide system replication snapshots..."
                  className="w-full bg-zinc-50 border border-zinc-200/60 rounded-lg px-3 py-2 text-xs text-[#121212] focus:outline-none focus:ring-2 focus:ring-zinc-250 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-600 text-xs font-semibold rounded-lg border border-zinc-200 shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#121212] hover:bg-zinc-800 text-[#FAF9F6] text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
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