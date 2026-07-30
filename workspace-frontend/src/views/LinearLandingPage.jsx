import React, { useState } from 'react';
import { 
  Shield, 
  Terminal, 
  GitPullRequest, 
  Ticket, 
  Fingerprint, 
  ArrowRight, 
  Layers, 
  Activity, 
  CheckCircle2,
  Sparkles,
  Command,
  Eye
} from 'lucide-react';

export default function LinearLandingPage({ onLaunchConsole }) {
  // Active state controller for the live pipeline preview module
  const [activeTab, setActiveTab] = useState('support');

  return (
    <div className="bg-[#FAF9F6] text-[#121212] font-sans min-h-screen flex flex-col overflow-x-hidden antialiased selection:bg-indigo-100">
      
      {/* Linear-Style Sub-pixel Layout Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>
      
      {/* Global Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FAF9F6]/80 border-b border-zinc-200/40 px-6 lg:px-16 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#121212] flex items-center justify-center">
            <Shield className="text-[#FAF9F6] w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#121212]">Unified Workspace</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-500 tracking-wide">
          <a href="#identity" className="hover:text-[#121212] transition-colors">Identity Layer</a>
          <a href="#pipeline" className="hover:text-[#121212] transition-colors">Live Simulator</a>
          <a href="#support" className="hover:text-[#121212] transition-colors">Support Hub</a>
          <a href="#review" className="hover:text-[#121212] transition-colors">Review Console</a>
        </nav>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onLaunchConsole('login')}
            className="text-xs font-semibold text-zinc-600 hover:text-[#121212] transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button 
            onClick={() => onLaunchConsole('register')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#121212] text-[#FAF9F6] rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-all active:scale-[0.98] shadow-sm shadow-black/5 cursor-pointer"
          >
            Create Workspace
            <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 max-w-4xl mx-auto z-10">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 border border-zinc-200/60 rounded-full text-zinc-600 text-[11px] font-mono uppercase tracking-wider">
          <Terminal className="w-3 h-3 text-zinc-400" />
          Evaluation Build v2026.7.30
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-[#121212] mb-6 leading-[1.05] font-sans max-w-3xl">
          The unified engine for operations and code lifecycle.
        </h1>
        
        <p className="text-base sm:text-lg text-zinc-500 mb-10 max-w-xl leading-relaxed">
          Streamline customer ticket queues and production deployment pipelines. Powered by isolated multi-tenancy and background AI analytics.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center w-full sm:w-auto">
          <button 
            onClick={() => onLaunchConsole('register')}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#121212] text-[#FAF9F6] rounded-lg font-semibold text-xs shadow-md shadow-black/10 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            Create New Workspace
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform stroke-[2.5]" />
          </button>
          <button 
            onClick={() => onLaunchConsole('login')}
            className="w-full sm:w-auto px-5 py-2.5 bg-white text-zinc-600 border border-zinc-200 rounded-lg font-semibold text-xs hover:bg-zinc-50 transition-all text-center shadow-sm cursor-pointer"
          >
            Sign In to Existing Node
          </button>
        </div>
      </section>

      {/* CRITICAL ADDITION: The Live Interactive Workspace Pipeline Simulator */}
      <section id="pipeline" className="px-6 lg:px-16 pb-24 max-w-5xl mx-auto w-full z-10 relative">
        <div className="bg-white border border-zinc-200/60 rounded-xl shadow-xl shadow-zinc-200/30 overflow-hidden">
          {/* Mock Console Top Command Bar */}
          <div className="bg-[#FAF9F6] px-4 py-3 border-b border-zinc-200/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-300"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-300"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-300"></div>
              <span className="text-[11px] font-mono text-zinc-400 ml-2 flex items-center gap-1">
                <Command className="w-3 h-3" /> system-telemetry-panel
              </span>
            </div>
            {/* Interactive Selector Switches */}
            <div className="flex bg-zinc-200/50 p-0.5 rounded-md border border-zinc-200/30">
              <button 
                onClick={() => setActiveTab('support')}
                className={`px-3 py-1 text-[11px] font-medium rounded-sm flex items-center gap-1.5 transition-all ${activeTab === 'support' ? 'bg-white text-[#121212] shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
              >
                <Ticket className="w-3 h-3" /> Operational Support
              </button>
              <button 
                onClick={() => setActiveTab('review')}
                className={`px-3 py-1 text-[11px] font-medium rounded-sm flex items-center gap-1.5 transition-all ${activeTab === 'review' ? 'bg-white text-[#121212] shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
              >
                <GitPullRequest className="w-3 h-3" /> Review & Audit
              </button>
            </div>
          </div>

          {/* Dynamic Interface Simulator Workspace Panel Content */}
          <div className="p-6 min-h-[220px] transition-all duration-300">
            {activeTab === 'support' ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Cross-Org Active Queues</span>
                  <span className="text-[11px] font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-semibold">Shared Identity Mapping</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-[#FAF9F6] border border-zinc-200/30 rounded-lg">
                    <div className="text-[10px] font-mono text-zinc-400 mb-1">TICKET-402</div>
                    <div className="text-xs font-semibold text-zinc-800 truncate">Payment Integration Latency</div>
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600 font-medium">● High Priority</div>
                  </div>
                  <div className="p-3 bg-[#FAF9F6] border border-zinc-200/30 rounded-lg">
                    <div className="text-[10px] font-mono text-zinc-400 mb-1">TICKET-405</div>
                    <div className="text-xs font-semibold text-zinc-800 truncate">OAuth Token Renewal Slip</div>
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-500 font-medium">● Normal</div>
                  </div>
                  <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-lg">
                    <div className="text-[10px] font-mono text-indigo-500 mb-1">INBOUND REQ</div>
                    <div className="text-xs font-semibold text-indigo-900 truncate">RydeX Core System Link</div>
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-indigo-600 font-semibold">→ Pending Action</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">PR Version Review Logs</span>
                  <span className="text-[11px] font-mono bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded font-semibold">Append-Only Ledger</span>
                </div>
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-2.5 bg-[#FAF9F6] border border-zinc-200/40 rounded-lg flex justify-between items-center">
                    <div className="flex items-center gap-2 text-zinc-700">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>PR #12: Merge staging release build</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">v1.0.4 → v1.1.0</span>
                  </div>
                  <div className="p-2.5 bg-[#FAF9F6] border border-zinc-200/40 rounded-lg flex justify-between items-center">
                    <div className="flex items-center gap-2 text-zinc-700">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>PR #14: Patch OAuth callback interceptor route</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">v1.1.0 → v1.1.1</span>
                  </div>
                </div>
              </div>
            )}

            {/* Simulated Live Gemini Output Log Block Banner */}
            <div className="mt-6 p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-left font-mono text-[11px] relative overflow-hidden group">
              <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                <Sparkles className="w-2.5 h-2.5 text-indigo-400 animate-pulse" /> Gemini Automated Telemetry
              </div>
              <div className="text-zinc-400 flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                <span className="text-indigo-400 font-semibold">[CronWorker]</span> Running scheduled workspace analytics cycle...
              </div>
              <div className="text-zinc-200 pl-4 mt-2">
                {activeTab === 'support' 
                  ? "» Pipeline Status: 2 active operational tickets located inside database models. 1 pending cross-organization partnership request awaiting admin signature authorization."
                  : "» Pipeline Status: Code architecture aligned successfully. 2 core repository deployments executed across isolated tenant domains. Cryptographic logs verified."
                }
              </div>
              <div className="text-emerald-400 pl-4 font-semibold mt-1">✓ Live executive operation summary committed safely back to metadata schemas.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Segment 1: The Core Foundation (Single Identity Layer) */}
      <section id="identity" className="px-6 lg:px-16 py-16 bg-white border-y border-zinc-200/40 relative">
        <div className="max-w-5xl mx-auto grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-5 space-y-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Fingerprint className="text-indigo-600 w-4 h-4 stroke-[2.5]" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#121212]">
              Single Identity Layer. <br />Seamless Context Control.
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Ditch fragmented logins. A singular, cohesive tenant engine cross-maps organization roles across distinct operations profiles. Access customer ticket histories or step directly into deployment audit logs without changing sessions.
            </p>
            <div className="pt-2 flex flex-col gap-2 font-mono text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                <span>Isolated PostgreSQL multi-tenancy profiles via Prisma</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                <span>Cross-tenant protection via custom backend middleware</span>
              </div>
            </div>
          </div>
          
          <div className="md:col-span-7 p-5 bg-[#FAF9F6] border border-zinc-200/50 rounded-xl font-mono text-[11px] text-zinc-600 shadow-inner">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200/40 mb-3 text-zinc-400">
              <span>Tenant Security Interceptor Middleware Context</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <span className="text-indigo-600 font-bold">export async function</span> <span className="text-zinc-800 font-bold">tenantGuard</span>(req, res, next) &#123; <br />
            &nbsp;&nbsp;<span className="text-zinc-400">// Verify cryptographic session allocations</span> <br />
            &nbsp;&nbsp;const member = await prisma.userOrgMembership.findUnique(&#123; <br />
            &nbsp;&nbsp;&nbsp;&nbsp;where: &#123; userId_orgId: &#123; userId, orgId &#125; &#125; <br />
            &nbsp;&nbsp;&#125;); <br />
            &nbsp;&nbsp;if (!member) return res.status(<span className="text-amber-600">403</span>).json("Access Denied"); <br />
            &nbsp;&nbsp;next(); <br />
            &#125;
          </div>
        </div>
      </section>

      {/* Segment 2: Parallel Dynamic Workspaces (Modules) */}
      <section className="px-6 lg:px-16 py-20 bg-[#FAF9F6] max-w-5xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-12">
          
          {/* Module A: Support Hub */}
          <div id="support" className="space-y-4 p-6 bg-white border border-zinc-200/40 rounded-xl shadow-sm hover:shadow-md transition-all">
            <div className="w-7 h-7 rounded-md bg-zinc-100 flex items-center justify-center">
              <Ticket className="text-zinc-600 w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#121212]">Operational Support Hub</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Track customer ticket volumes across organizational queues. Features integrated relation parameters allowing segmented workspaces to securely share relevant ticket scopes, maintaining cross-organization collaboration within an un-cluttered tabular display.
            </p>
            <div className="bg-[#FAF9F6] border border-zinc-100 p-3 rounded-lg font-mono text-[11px] flex justify-between items-center">
              <span className="text-zinc-800 font-medium">Inbound Cross-Org Ticket Requests</span>
              <span className="bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded text-[10px]">3 Pending</span>
            </div>
          </div>

          {/* Module B: Review Console */}
          <div id="review" className="space-y-4 p-6 bg-white border border-zinc-200/40 rounded-xl shadow-sm hover:shadow-md transition-all">
            <div className="w-7 h-7 rounded-md bg-zinc-100 flex items-center justify-center">
              <GitPullRequest className="text-zinc-600 w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#121212]">Review & Audit Console</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Enables developer teams to monitor pipeline velocity and PR version steps. Directly inspect structural metadata payloads securely via an append-only historical audit ledger stream window that renders deep trace profiles instantly.
            </p>
            <div className="bg-[#FAF9F6] border border-zinc-100 p-3 rounded-lg font-mono text-[11px] flex justify-between items-center text-zinc-400">
              <span>Ledger: v1.0.4 → v1.1.0</span>
              <span className="text-[#121212] font-semibold bg-zinc-200/60 px-2 py-0.5 rounded text-[10px]">SYSTEM_AI_DIGEST_CRON</span>
            </div>
          </div>

        </div>
      </section>

      {/* Segment 3: The Background AI Engine Core */}
      <section id="engine" className="px-6 lg:px-16 py-16 bg-white border-t border-zinc-200/40 text-center relative overflow-hidden">
        <div className="max-w-2xl mx-auto">
          <Layers className="text-zinc-400 w-6 h-6 mx-auto mb-4" />
          <h2 className="text-xl font-bold tracking-tight text-[#121212] mb-3">
            Ai Background Automation
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed mb-6 max-w-lg mx-auto">
            A background cron worker task cycle sweeps operational analytics continuously, piping distinct metrics arrays through advanced `gemini-2.5-flash` content generation routines to render crisp, three-sentence workspace status digests.
          </p>
          <div className="bg-[#FAF9F6] text-left border border-zinc-200/50 rounded-xl p-4 shadow-sm max-w-md mx-auto font-mono text-[10px] text-zinc-500">
            <span className="text-indigo-600">[BackgroundWorker]</span> Commencing telemetry digest evaluations... <br />
            <span className="text-emerald-600">✅</span> AI Analysis digest completed successfully via Gemini. <br />
            <span className="text-zinc-400">» Snapshot payload cached successfully to multi-tenant metadata keys.</span>
          </div>
        </div>
      </section>

      {/* Sticky Compliance Fine-Print Footer */}
      <footer id="architecture" className="mt-auto px-6 lg:px-16 py-6 border-t border-zinc-200/30 flex flex-col sm:flex-row justify-between items-center text-[11px] font-mono text-zinc-400 bg-[#FAF9F6]">
        <span>Unified Workspace Engine // Engineering Assessment Release.</span>
        <div className="flex gap-4 mt-2 sm:mt-0">
          <span>React (Vite)</span>
          <span>Tailwind CSS</span>
          <span>Prisma ORM</span>
          <span>Gemini Core AI</span>
        </div>
      </footer>
    </div>
  );
}