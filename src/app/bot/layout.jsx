"use client";

import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { 
  Shield, Zap, Activity, Lock, 
  LogOut, LayoutDashboard, Terminal,
  Server, AlertCircle, RefreshCw, FileText, Menu, X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function BotLayoutContent({ children }) {
  const { user, loading, logout, login } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          <p className="text-zinc-500 font-mono text-sm">Initializing Bot System...</p>
        </div>
      </div>
    );
  }

  // Not Logged In -> Show Dedicated Bot Login (or reused LoginScreen)
  if (!user) {
    // We can use a specialized login or the standard one. 
    // The previous code had <BotLogin /> which wasn't defined in the snippet I saw, 
    // but line 31 said <BotLogin login={login} />.
    // I should check if BotLogin is defined in the file or imported.
    // Wait, I read the file and I didn't see BotLogin imported or defined.
    // Ah, I only read the first 100 lines. Let me check if BotLogin is defined later in the file.
    return <BotLogin login={login} />;
  }

  // Permission Check
  // Allowed: Users with 'bot' right OR 'sysop' (admin) group
  const isBot = user.groups?.includes("bot") || user.rights?.includes("bot");
  const isAdmin = user.groups?.includes("sysop") || user.groups?.includes("bureaucrat");
  const hasAccess = isBot || isAdmin;

  if (!hasAccess) {
    return <AccessDenied user={user} logout={logout} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-500/30 flex">
      {/* Mobile Toggle */}
      <button 
        className="lg:hidden fixed top-4 right-4 z-[60] p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-200 lg:relative lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-full flex flex-col">
          {/* Brand */}
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <Terminal className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="font-bold text-white tracking-tight">BotManager</h1>
                <p className="text-xs text-zinc-500 font-mono">v1.0.0 System</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-2">Core</div>
            <NavItem href="/bot" icon={LayoutDashboard} label="Dashboard" />
            
            <div className="mt-6 text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-2">Active Bots</div>
            <NavItem href="/bot/citationbot" icon={Zap} label="Citation Bot" />
            <NavItem href="/bot/updatebot" icon={RefreshCw} label="Update Bot" />
            <NavItem href="/bot/rewritearticle" icon={FileText} label="Rewrite Bot" />
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{user.name}</div>
                <div className="text-xs text-zinc-500 flex items-center gap-1">
                  {isAdmin ? <Shield className="w-3 h-3 text-amber-500" /> : <Zap className="w-3 h-3 text-emerald-500" />}
                  {isAdmin ? "Admin Access" : "Bot Access"}
                </div>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-zinc-950">
        {children}
      </main>
    </div>
  );
}

export default function BotLayout({ children }) {
  return (
    <AuthProvider>
      <BotLayoutContent>{children}</BotLayoutContent>
    </AuthProvider>
  );
}

function NavItem({ href, icon: Icon, label }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        isActive 
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

function BotLogin({ login }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <Server className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Bot Management System</h1>
          <p className="text-sm text-zinc-500">Restricted Access Environment</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-900/50 text-red-400 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase">Bot / Admin Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-300 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              placeholder="Enter username..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-300 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 mt-2"
          >
            {loading ? "Authenticating..." : "Access System"}
          </button>
        </form>
        
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 text-center">
          <Link href="/" className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors">
            ← Return to Main Site
          </Link>
        </div>
      </div>
    </div>
  );
}

function AccessDenied({ user, logout }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-red-900/30 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-900/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-900/20">
          <Lock className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Your account <span className="text-white font-mono bg-zinc-800 px-1 rounded">{user.name}</span> does not have the required 
          <span className="text-emerald-400 mx-1">Bot</span> or <span className="text-amber-400 mx-1">Admin</span> rights to access this system.
        </p>
        <button 
          onClick={logout}
          className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
