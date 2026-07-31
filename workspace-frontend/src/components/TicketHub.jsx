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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
      {/* Left 1 Column: Ticket Streams & Management */}
      <div className={`lg:col-span-1 space-y-4 ${mobileView === 'list' ? 'block' : 'hidden lg:block'}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Workspace Tickets</h3>
          {activeWorkspace?.role !== 'GUEST' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4.5 py-2.5 text-sm font-bold bg-gradient-to-r from-indigo-950 to-slate-900 hover:from-indigo-900 hover:to-slate-850 rounded-xl text-white shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            >
              + File Ticket
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-slate-400 font-mono">Syncing streaming queues...</div>
        ) : tickets.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-slate-200 text-sm text-slate-400 text-center font-medium">
            No active tickets matching this tenant matrix.
          </div>
        ) : (
          <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => handleSelectTicket(ticket)}
                className={`p-5 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                  selectedTicket?.id === ticket.id
                    ? 'bg-indigo-50/50 border-indigo-300 shadow-[0_4px_12px_-3px_rgba(79,70,229,0.08)] scale-[1.01] ring-1 ring-indigo-200/50'
                    : 'bg-white border-slate-200 hover:border-slate-350 hover:shadow-xs hover:-translate-y-0.5'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <h4 className="text-sm sm:text-base font-bold text-slate-800 truncate">{ticket.title}</h4>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold uppercase tracking-widest ${
                    ticket.status === 'OPEN' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-slate-100 text-slate-550 border border-slate-200'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 mt-1.5 leading-relaxed font-medium">
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
          <div className="bg-white border border-slate-200 rounded-2xl p-7 space-y-6 min-h-[400px] flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_25px_-2px_rgba(0,0,0,0.05)] transition-all duration-300">
            <div className="space-y-6">
              {/* Mobile Back Button */}
              <button
                onClick={() => setMobileView('list')}
                className="lg:hidden flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-bold mb-3 transition-colors w-fit cursor-pointer"
              >
                ← Back to tickets
              </button>
              <div className="flex flex-wrap justify-between items-start border-b border-slate-100 pb-4 gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{selectedTicket.title}</h2>
                  <span className="text-xs font-mono text-slate-400 block mt-1">ID: {selectedTicket.id}</span>
                </div>
                
                {/* Cross-Org Alignment Actions Panel */}
                {activeWorkspace?.role === 'ORG_ADMIN' && (
                  <form onSubmit={handleShareTicket} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      required
                      placeholder="Partner Org ID"
                      value={targetOrgId}
                      onChange={(e) => setTargetOrgId(e.target.value)}
                      className="bg-transparent text-xs px-3 py-1.5 focus:outline-none text-slate-800 w-40 font-mono"
                    />
                    <button type="submit" className="px-3.5 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-350 shadow-3xs cursor-pointer transition-all active:scale-95">
                      Share External
                    </button>
                  </form>
                )}
              </div>

              {/* Description Body */}
              <div className="text-sm sm:text-base text-slate-700 bg-slate-50 p-5 rounded-2xl border border-slate-200 leading-relaxed font-medium">
                {selectedTicket.description}
              </div>

              {/* Interactive Comments Log Flow */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activity & Feedback Log</h4>
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-sm text-slate-400 italic font-medium pl-0.5">No notes committed to file yet.</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="text-sm bg-slate-50/60 p-4 rounded-xl border border-slate-200/50 space-y-1.5 hover:border-slate-300 transition-colors">
                        <div className="flex justify-between text-xs font-mono text-slate-400">
                          <span className="text-indigo-650 font-bold">{comment.author?.email || comment.user?.email || 'System Agent'}</span>
                          <span>{new Date(comment.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-700 font-medium leading-relaxed">{comment.content || comment.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Comment Insertion Input Form */}
            <form onSubmit={handleAddComment} className="border-t border-slate-100 pt-5 flex gap-3">
              <input
                type="text"
                placeholder="Append internal case note summary..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-250 text-sm rounded-xl px-4.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-indigo-950 hover:to-indigo-900 font-bold text-sm rounded-xl text-white transition-all shadow-sm cursor-pointer hover:-translate-y-0.5 active:scale-98"
              >
                Commit
              </button>
            </form>
          </div>
        ) : (
          <div className="h-full min-h-[400px] bg-white border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-400 font-mono text-sm p-8 shadow-xs">
            🔮 Select an active tracking file from the stream queue to verify metadata layers.
          </div>
        )}
      </div>

      {/* Ticket Creation Modal Layer Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 w-full max-w-lg space-y-5 shadow-2xl animate-fadeIn text-[#121212]">
            <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">Log Operational Core Ticket</h3>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Case Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Memory leak inside worker thread context"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Diagnostic Details</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide system replication snapshots..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-655 text-sm font-bold rounded-xl border border-slate-200 shadow-3xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-3 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-indigo-950 hover:to-indigo-900 text-white text-sm font-bold rounded-xl shadow-sm hover:-translate-y-0.5 active:scale-98 transition-all cursor-pointer"
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