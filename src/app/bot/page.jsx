"use client";

import { useState, useEffect } from "react";
import { Activity, Server, Clock, GitCommit } from "lucide-react";
import Link from "next/link";
import axios from "axios";

export default function BotDashboard() {
  const [stats, setStats] = useState({
    activeBots: 1,
    totalEdits: 0,
    systemStatus: "Operational"
  });

  useEffect(() => {
    // Fetch stats for known bots
    const fetchStats = async () => {
      try {
        const res = await axios.get("/api/justapedia", {
          params: {
            action: "query",
            list: "users",
            ususers: "Citation Bot",
            usprop: "editcount",
            format: "json"
          }
        });
        const user = res.data?.query?.users?.[0];
        if (user) {
          setStats(prev => ({ ...prev, totalEdits: user.editcount || 0 }));
        }
      } catch (e) {
        console.error("Failed to fetch bot stats", e);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">System Overview</h1>
        <p className="text-zinc-400">Monitor and manage automated bot processes.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard 
          title="Active Bots" 
          value={stats.activeBots} 
          icon={Server} 
          color="emerald" 
        />
        <StatCard 
          title="Total Bot Edits" 
          value={stats.totalEdits.toLocaleString()} 
          icon={GitCommit} 
          color="blue" 
        />
        <StatCard 
          title="System Status" 
          value={stats.systemStatus} 
          icon={Activity} 
          color="purple" 
        />
      </div>

      {/* Active Bots List */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Deployed Bots</h2>
          <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
            Total: 1
          </span>
        </div>
        <div className="divide-y divide-zinc-800">
          <BotRow 
            name="Citation Bot" 
            status="Running" 
            lastActive="2 mins ago" 
            edits={stats.totalEdits}
            href="/bot/citationbot"
          />
          <BotRow 
            name="Update Bot" 
            status="Ready" 
            lastActive="Just now" 
            edits={stats.totalEdits} // Shared count for now as they use same user
            href="/bot/updatebot"
          />
          <BotRow 
            name="Rewrite Bot" 
            status="Beta" 
            lastActive="Offline" 
            edits={0} 
            href="/bot/rewritearticle"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-start justify-between hover:border-zinc-700 transition-colors">
      <div>
        <p className="text-zinc-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg border ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

function BotRow({ name, status, lastActive, edits, href }) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-zinc-900/80 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold border border-zinc-700">
          {name.charAt(0)}
        </div>
        <div>
          <h3 className="text-white font-medium group-hover:text-emerald-400 transition-colors">
            <Link href={href} className="focus:outline-none">
              <span className="absolute inset-0" aria-hidden="true" />
              {name}
            </Link>
          </h3>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>{edits.toLocaleString()} edits</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {lastActive}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          status === "Running" 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
            : "bg-red-500/10 text-red-400 border-red-500/20"
        }`}>
          {status}
        </span>
      </div>
    </div>
  );
}
