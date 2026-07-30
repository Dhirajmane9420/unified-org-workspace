import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { PlusCircle, ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';

export default function CreateWorkspaceView({ onCreated, onCancel }) {
  const { authenticatedFetch, addWorkspace } = useWorkspace();
  const [orgName, setOrgName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setError('Workspace name is required');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await authenticatedFetch('/api/organizations/create', {
        method: 'POST',
        body: JSON.stringify({
          orgName: orgName.trim(),
          subdomain: subdomain.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize workspace');
      }

      setSuccess(true);
      
      // Update local context switcher maps
      setTimeout(() => {
        addWorkspace(data.organization.name, data.organization.id, 'ORG_ADMIN');
        if (onCreated) {
          onCreated();
        }
      }, 1000);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto my-12 animate-fadeIn">
      {/* Back button */}
      <button 
        onClick={onCancel}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 text-xs font-semibold mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </button>

      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-8 shadow-xl shadow-zinc-200/40 text-[#121212]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <PlusCircle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-lg tracking-tight">Initialize Workspace</h3>
            <p className="text-zinc-400 text-xs mt-0.5 font-mono">Create an isolated organization context.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600 flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto animate-bounce">
              ✓
            </div>
            <h4 className="font-bold text-sm text-zinc-800">Workspace Context Initialized</h4>
            <p className="text-xs text-zinc-400">Rebuilding multi-tenant routing mappings...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="orgName" className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
                Workspace Name
              </label>
              <input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Wayne Enterprises"
                disabled={loading}
                className="w-full text-xs font-medium bg-zinc-50 border border-zinc-200 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl px-4.5 py-3.5 transition-all text-zinc-800 placeholder-zinc-400 shadow-inner"
                required
              />
            </div>

            <div>
              <label htmlFor="subdomain" className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
                Subdomain Access Key
              </label>
              <div className="flex items-center">
                <input
                  id="subdomain"
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="wayne-ent"
                  disabled={loading}
                  className="w-full text-xs font-medium bg-zinc-50 border border-zinc-200 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-l-xl px-4.5 py-3.5 transition-all text-zinc-800 placeholder-zinc-400 shadow-inner"
                />
                <span className="bg-zinc-100 border border-l-0 border-zinc-200 text-[10px] font-mono font-bold text-zinc-400 px-3.5 py-4 rounded-r-xl select-none">
                  .unified.com
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1.5 font-mono leading-relaxed">
                Letters, numbers, and hyphens only.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-[#121212] hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Spinning Up Engine...
                </>
              ) : (
                'Create New Workspace'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
