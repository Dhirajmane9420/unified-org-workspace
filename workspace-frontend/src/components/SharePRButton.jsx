import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

export default function SharePRButton({ pullRequestId, ownerOrgId, onShareSuccess }) {
  const { activeWorkspace, authenticatedFetch } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState('');
  const [loading, setLoading] = useState(false);

  // Limit PR sharing only to active organization owners (BOLA check at UI level)
  const isOwner = activeWorkspace?.organizationId === ownerOrgId;
  const isAuthorized = activeWorkspace?.role === 'ORG_ADMIN' || activeWorkspace?.role === 'REVIEWER';

  if (!isOwner || !isAuthorized) {
    return null; // Don't render the sharing option if the user doesn't own this PR or doesn't have review credentials
  }

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    if (!targetOrgId.trim()) {
      alert('Please enter a valid Partner Organization ID');
      return;
    }

    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/share/pr', {
        method: 'POST',
        body: JSON.stringify({
          pullRequestId,
          targetOrgId: targetOrgId.trim()
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert('Pull request successfully shared with your partner organization!');
        setIsOpen(false);
        setTargetOrgId('');
        if (onShareSuccess) {
          onShareSuccess(result.data);
        }
      } else {
        alert(`Sharing failed: ${result.error || 'Verify an approved connection contract exists.'}`);
      }
    } catch (err) {
      console.error('Failed to dispatch share operation:', err);
      alert('Network failure occurred while sharing the pull request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4.5 py-2.5 text-xs sm:text-sm font-bold bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 hover:border-slate-350 rounded-xl shadow-3xs transition-all cursor-pointer active:scale-95"
      >
        Share PR
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-7 space-y-5 animate-fadeIn text-[#121212]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Share Pull Request</h3>
              <button 
                onClick={() => { setIsOpen(false); setTargetOrgId(''); }}
                className="text-slate-450 hover:text-slate-700 text-sm font-bold cursor-pointer"
                disabled={loading}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleShareSubmit} className="space-y-5 text-left">
              <p className="text-sm text-slate-500 leading-relaxed">
                Provide the **Organization ID** of your active approved partner. Once shared, this pull request will populate their Review Control pipeline and synchronize with their audit timeline history.
              </p>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block font-mono">
                  Partner Organization ID
                </label>
                <input 
                  type="text" 
                  value={targetOrgId}
                  onChange={(e) => setTargetOrgId(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="e.g. ce8c178d-611d-4c2f-9efb-9fae2adc96d3"
                  className="w-full bg-slate-55 border border-slate-250 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { setIsOpen(false); setTargetOrgId(''); }}
                  disabled={loading}
                  className="px-5 py-3 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-650 hover:bg-slate-55 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-5 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-indigo-950 hover:to-indigo-900 text-white cursor-pointer hover:-translate-y-0.5 active:scale-98 transition-all disabled:opacity-55"
                >
                  {loading ? 'Sharing...' : 'Confirm Share'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
