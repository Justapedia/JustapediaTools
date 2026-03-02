"use client";

import { useState } from "react";
import { ShieldCheck, User, Key, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center border-b border-zinc-800 bg-zinc-900/80">
            <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-red-500/20 rotate-3 hover:rotate-6 transition-transform duration-500">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              JP Tools Access
            </h1>
            <p className="text-zinc-500 text-sm mt-2">
              Login with Justapedia to access tools
            </p>
          </div>

          {/* Form */}
          <div className="p-8 space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-3">
                <Lock className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 ml-1">USERNAME</label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500 group-focus-within:text-red-400 transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                    placeholder="Justapedia Username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 ml-1">PASSWORD</label>
                <div className="relative group">
                  <Key className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500 group-focus-within:text-red-400 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {loading ? "Authenticating..." : "Login"}
              </button>
            </form>
          </div>
          
          <div className="px-8 py-4 bg-zinc-950/50 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-600 mb-2">
              Authorized access only.
            </p>
            <p className="text-xs text-zinc-500">
              Don&apos;t have an account?{" "}
              <a 
                href="https://justapedia.org/wiki/Special:CreateAccount" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-red-400 hover:text-red-300 hover:underline"
              >
                Create one
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
