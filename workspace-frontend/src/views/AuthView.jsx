import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ShieldAlert, CheckCircle2, Network, TrendingUp, Lock, ShieldCheck } from 'lucide-react';

export default function AuthView({ initialMode = 'login', onBackToLanding }) {
  const { loginUser } = useWorkspace();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');

  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success'

  // Form Fields State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [activeFocus, setActiveFocus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('loading');

    const BASE_URL = import.meta.env.VITE_API_URL || '';
    const endpoint = `${BASE_URL}${isLogin ? '/api/v1/auth/login' : '/api/v1/auth/register'}`;
    const payload = isLogin ? { email, password } : { email, password, orgName };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication process failed');
      }

      setStatus('success');

      if (isLogin) {
        // Automatically update context values on successful login
        setTimeout(() => {
          loginUser(data);
        }, 1000);
      } else {
        // Automatically toggle to login flow on successful initial workspace registration
        setTimeout(() => {
          setIsLogin(true);
          setError('Workspace created successfully! Please sign in with your credentials.');
          setOrgName('');
          setStatus('idle');
        }, 1500);
      }
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  };

  return (
    <div className="bg-[#FAF9F6] text-[#121212] font-sans min-h-screen flex flex-col overflow-x-hidden relative select-none">
      
      {/* Dynamic Embedded Styles for Custom Animated Layout Assets */}
      <style>{`
        @keyframes grid-move {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(1deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        .grid-animation {
          animation: grid-move 8s ease-in-out infinite;
        }
        .mesh-gradient {
          background-color: #f8fafc;
          background-image: 
            radial-gradient(at 0% 0%, hsla(243, 75%, 95%, 1) 0, transparent 50%), 
            radial-gradient(at 50% 0%, hsla(226, 70%, 94%, 1) 0, transparent 50%), 
            radial-gradient(at 100% 0%, hsla(243, 75%, 95%, 1) 0, transparent 50%);
        }
      `}</style>

      {/* Top Application Header Shell Wrapper */}
      <header className="absolute top-0 w-full z-50 flex justify-between items-center px-6 py-4 bg-transparent">
        <div className="flex items-center gap-2 cursor-pointer select-none hover:opacity-85 transition-opacity" onClick={onBackToLanding}>
          <ShieldAlert className="text-[#3525cd] w-7 h-7 stroke-[2.5]" />
          <h1 className="text-xl font-bold tracking-tight text-[#121212]">Unified Workspace</h1>
        </div>
      </header>

      {/* Main Structural Column Frame Layout */}
      <main className="flex-grow flex flex-col lg:flex-row mt-14 lg:mt-0">
        
        {/* Left Interactive Corporate Features Column */}
        <section className="hidden lg:flex flex-1 mesh-gradient relative overflow-hidden items-center justify-center p-8">
          <div className="relative z-10 max-w-xl text-left">
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-1 bg-[#3525cd]/10 border border-[#3525cd]/20 rounded-full text-[#3525cd] text-xs font-medium tracking-wide">
              <ShieldCheck className="w-4 h-4" />
              Enterprise Grade Security
            </div>
            
            <h2 className="text-3xl font-bold text-[#191c1e] mb-4 leading-tight tracking-tight">
              Unified Workspace <br /> Management Engine
            </h2>
            
            <p className="text-base text-[#5a5e69] mb-8 max-w-md leading-relaxed">
              Orchestrate global operations with precision. A single gateway to your enterprise resources, infrastructure, and regional clusters.
            </p>

            <div className="flex gap-4">
              <div className="flex flex-col items-center justify-center p-4 bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm w-32 h-32 transition-transform duration-300 hover:-translate-y-1">
                <Network className="text-[#3525cd] mb-2 w-8 h-8" />
                <span className="text-xs font-medium text-center text-[#464555]">Global Nodes</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm w-32 h-32 transition-transform duration-300 hover:-translate-y-1">
                <TrendingUp className="text-[#3525cd] mb-2 w-8 h-8" />
                <span className="text-xs font-medium text-center text-[#464555]">Real-time Metrics</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm w-32 h-32 transition-transform duration-300 hover:-translate-y-1">
                <Lock className="text-[#3525cd] mb-2 w-8 h-8" />
                <span className="text-xs font-medium text-center text-[#464555]">Zero Trust</span>
              </div>
            </div>
          </div>

          {/* Abstract SVG Structural Layout Grid Layer */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <svg className="grid-animation" height="100%" width="100%">
              <defs>
                <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
                  <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#3525cd" strokeWidth="1" />
                </pattern>
              </defs>
              <rect fill="url(#grid)" width="100%" height="100%" style={{ transform: 'perspective(500px) rotateX(60deg) translateY(-20%)' }} />
            </svg>
          </div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#3525cd]/5 rounded-full blur-3xl"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#3525cd]/10 rounded-full blur-3xl"></div>
        </section>

        {/* Right Authentication Action Panel Column */}
        <section className="flex-1 flex flex-col items-center justify-center p-4 relative">
          <div className="w-full max-w-[448px] bg-white rounded-2xl border border-zinc-200/60 shadow-xl shadow-slate-900/5 p-10 transition-all duration-500">
            
            <div className="mb-8">
              <h3 className="text-2xl font-semibold tracking-tight text-[#191c1e] mb-1">
                {isLogin ? 'Sign in to platform' : 'Initialize workspace'}
              </h3>
              <p className="text-sm text-[#5a5e69]">
                {isLogin ? "Need an isolated developer stack?" : "Already configured your entry channels?"}{' '}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError(''); }}
                  className="text-[#3525cd] font-semibold hover:underline transition-all cursor-pointer bg-transparent border-0 p-0"
                >
                  {isLogin ? 'Register Organization' : 'Back to login'}
                </button>
              </p>
            </div>

            {error && (
              <div className={`mb-6 p-3.5 rounded-xl text-xs border font-semibold transition-all duration-200 ${
                error.includes('successfully') 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}>
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              
              {/* input field block: orgName */}
              {!isLogin && (
                <div className="space-y-1">
                  <label 
                    className={`text-sm font-semibold block transition-colors duration-200 ${activeFocus === 'organizationName' ? 'text-[#3525cd]' : 'text-[#464555]'}`} 
                    htmlFor="organizationName"
                  >
                    Organization / Workspace Name
                  </label>
                  <input 
                    className="w-full px-4 py-3 bg-[#dee2ef]/40 border-0 rounded-xl text-sm font-medium text-[#191c1e] placeholder-[#777587] focus:outline-none focus:ring-4 focus:ring-[#3525cd]/10 transition-all duration-200"
                    id="organizationName" 
                    type="text"
                    placeholder="e.g. Acme Engineering"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    onFocus={() => setActiveFocus('organizationName')}
                    onBlur={() => setActiveFocus(null)}
                    required
                  />
                </div>
              )}

              {/* input field block: email */}
              <div className="space-y-1">
                <label 
                  className={`text-sm font-semibold block transition-colors duration-200 ${activeFocus === 'email' ? 'text-[#3525cd]' : 'text-[#464555]'}`} 
                  htmlFor="email"
                >
                  Email Address
                </label>
                <input 
                  className="w-full px-4 py-3 bg-[#dee2ef]/40 border-0 rounded-xl text-sm font-medium text-[#191c1e] placeholder-[#777587] focus:outline-none focus:ring-4 focus:ring-[#3525cd]/10 transition-all duration-200"
                  id="email" 
                  type="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setActiveFocus('email')}
                  onBlur={() => setActiveFocus(null)}
                  required
                />
              </div>

              {/* input field block: password */}
              <div className="space-y-1">
                <label 
                  className={`text-sm font-semibold block transition-colors duration-200 ${activeFocus === 'password' ? 'text-[#3525cd]' : 'text-[#464555]'}`} 
                  htmlFor="password"
                >
                  Password
                </label>
                <input 
                  className="w-full px-4 py-3 bg-[#dee2ef]/40 border-0 rounded-xl text-sm font-medium text-[#191c1e] placeholder-[#777587] focus:outline-none focus:ring-4 focus:ring-[#3525cd]/10 transition-all duration-200"
                  id="password" 
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setActiveFocus('password')}
                  onBlur={() => setActiveFocus(null)}
                  required
                />
              </div>

              {/* Dynamic Call-To-Action Primary Action Button */}
              <div className="pt-2">
                <button 
                  className={`group relative w-full flex items-center justify-center gap-2 py-3.5 text-white rounded-xl text-sm font-semibold shadow-lg transition-all active:scale-[0.98] ${
                    status === 'success' 
                      ? 'bg-emerald-600 shadow-emerald-600/10 cursor-default' 
                      : status === 'loading'
                      ? 'bg-[#4f46e5] shadow-indigo-600/10 cursor-wait'
                      : 'bg-[#3525cd] shadow-[#3525cd]/20 hover:bg-[#4f46e5]'
                  }`}
                  type="submit"
                  disabled={status !== 'idle'}
                >
                  {status === 'idle' && (
                    <span className="transition-all duration-200">
                      {isLogin ? 'Authenticate Session' : 'Create Workspace'}
                    </span>
                  )}
                  
                  {status === 'loading' && (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>{isLogin ? 'Authenticating...' : 'Creating Workspace...'}</span>
                    </span>
                  )}
                  
                  {status === 'success' && (
                    <span className="flex items-center gap-1.5 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      {isLogin ? 'Session Authenticated' : 'Workspace Created'}
                    </span>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
              <p className="text-sm text-[#5a5e69]">
                Don't have an account?{' '}
                <a className="text-[#3525cd] font-semibold hover:underline" href="#support">Contact Support</a>
              </p>
            </div>
          </div>

          {/* Mobile Footer Screen Information */}
          <div className="mt-8 md:hidden text-center max-w-[448px]">
            <p className="text-xs tracking-wide text-[#777587] leading-relaxed">
              © 2026 Unified Workspace Management Engine. <br />
              Secure Enterprise Environment.
            </p>
          </div>
        </section>
      </main>

      {/* Corporate Compliance Core Footer Sticky Shell Layout */}
      <footer className="absolute bottom-0 w-full z-50 hidden md:flex justify-between items-center px-6 py-4 bg-transparent pointer-events-none">
        <p className="text-xs font-medium text-[#c2c6d3] pointer-events-auto">
          © 2026 Unified Workspace Management Engine. Secure Enterprise Environment.
        </p>
        <div className="flex gap-6 pointer-events-auto">
          <a className="text-xs font-medium text-[#c2c6d3] hover:text-[#3525cd] transition-colors duration-200" href="#privacy">Privacy Policy</a>
          <a className="text-xs font-medium text-[#c2c6d3] hover:text-[#3525cd] transition-colors duration-200" href="#terms">Terms of Service</a>
          <a className="text-xs font-medium text-[#c2c6d3] hover:text-[#3525cd] transition-colors duration-200" href="#compliance">Security Compliance</a>
        </div>
      </footer>
    </div>
  );
}