"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  LayoutDashboard,
  Terminal,
  RefreshCw,
  FileText,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const VALID_USERNAME = "sourav";
const VALID_PASSWORD = "8636521212";
const STORAGE_KEY = "bot-section-authenticated";

export default function BotLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "true") {
      setAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  const handleLogin = (event) => {
    event.preventDefault();
    if (
      username.trim().toLowerCase() === VALID_USERNAME &&
      password === VALID_PASSWORD
    ) {
      localStorage.setItem(STORAGE_KEY, "true");
      setAuthenticated(true);
      setError("");
    } else {
      setError("Invalid username or password.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthenticated(false);
    setUsername("");
    setPassword("");
    setError("");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/95 p-8 shadow-xl shadow-black/20">
          <div className="mb-6 text-center">
            <Terminal className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white">Bot Section Login</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Enter credentials to access the bot manager.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block text-sm font-medium text-zinc-300">
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                placeholder="sourav"
              />
            </label>
            <label className="block text-sm font-medium text-zinc-300">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
                placeholder="Enter password"
              />
            </label>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              Sign in
            </button>
          </form>
          <p className="mt-6 text-xs text-zinc-500">
            This login only grants access to the bot section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-500/30 flex">
      <button
        className="lg:hidden fixed top-4 right-4 z-[60] p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-200 lg:relative lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <Terminal className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="font-bold text-white tracking-tight">
                  BotManager
                </h1>
                <p className="text-xs text-zinc-500 font-mono">v1.0.0 System</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-2">
              Core
            </div>
            <NavItem href="/bot" icon={LayoutDashboard} label="Dashboard" />
            <div className="mt-6 text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-2">
              Active Bots
            </div>
            <NavItem href="/bot/citationbot" icon={Zap} label="Citation Bot" />
            <NavItem
              href="/bot/updatebot"
              icon={RefreshCw}
              label="Update Bot"
            />
            <NavItem
              href="/bot/rewritearticle"
              icon={FileText}
              label="Rewrite Bot"
            />
          </nav>

          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 space-y-3">
            <button
              onClick={handleLogout}
              className="w-full rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-400 transition"
            >
              Log out
            </button>
            <Link
              href="/jptools"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors text-sm"
            >
              Back to JPTools
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto bg-zinc-950">
        {children}
      </main>
    </div>
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
