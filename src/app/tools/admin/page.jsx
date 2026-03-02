"use client";

import { 
  ShieldCheck, User, Lock, Key, 
  Activity, Calendar, Users, Hash, 
  LogOut, ChevronRight, Award, Server,
  Zap, AlertTriangle, Search, Shield, FilePlus, Settings, ArrowRight,
  BarChart2, FileText
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const adminTools = [
  {
    name: "Edit Counter",
    description: "Full user statistics: total edits, deleted edits, pages created, namespace totals, and more.",
    path: "/tools/edit-counter",
    icon: Users,
    color: "bg-blue-500",
  },
  {
    name: "Top Edits",
    description: "User’s most edited pages (per namespace) and detailed edits on a single page.",
    path: "/tools/top-edits",
    icon: BarChart2,
    color: "bg-teal-500",
  },
  {
    name: "Edit Summaries",
    description: "Analyzes edit summary usage over time (major/minor edits, monthly breakdown).",
    path: "/tools/edit-summaries",
    icon: FileText,
    color: "bg-cyan-500",
  },
  {
    name: "AntiVandal",
    description: "Real-time counter-vandalism tool for reverting bad edits.",
    path: "/tools/antivandal",
    icon: Zap,
    color: "bg-red-600",
  },
  {
    name: "Vandalism Checker",
    description: "Scan a user's recent edits for suspicious patterns and vandalism.",
    path: "/tools/vandalism-check",
    icon: AlertTriangle,
    color: "bg-orange-600",
  },
  {
    name: "User Contribution Search",
    description: "Find all edits by a specific user to a single page.",
    path: "/tools/usercontributionsearch",
    icon: Search,
    color: "bg-purple-600",
  },
  {
    name: "User Rights Inspector",
    description: "View user groups, rights, and rights change history logs.",
    path: "/tools/user-rights",
    icon: Shield,
    color: "bg-green-600",
  },
  {
    name: "Patroller Stats",
    description: "Statistics for patrolling/admin-like actions and activity summaries.",
    path: "/tools/patroller-stats",
    icon: Shield,
    color: "bg-pink-500",
  },
];

export default function AdminTools() {
  const { user, logout } = useAuth();

  // If user is not logged in, the layout will hide this page anyway
  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-indigo-500/30">
      {/* Main Content */}
      <div className="min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/20 backdrop-blur sticky top-0 z-10">
          <h2 className="font-semibold text-zinc-100">Dashboard</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-zinc-500">
              Logged in as <span className="text-indigo-400 font-medium">{user.name}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 p-[1px]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-6 max-w-7xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/20 p-8 md:p-12">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Welcome back, {user.name}
              </h1>
              <p className="text-indigo-200/70 max-w-2xl">
                You have full access to the Justapedia administration suite. 
                Your session is secure and encrypted.
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label="Edit Count" 
              value={user.editcount?.toLocaleString()} 
              icon={<Hash className="text-blue-400" />} 
              trend="+12% this month"
            />
            <StatCard 
              label="User ID" 
              value={`#${user.id}`} 
              icon={<Award className="text-purple-400" />} 
              sub="Unique Identifier"
            />
             <StatCard 
              label="Role" 
              value={user.groups?.[0] || "User"} 
              icon={<ShieldCheck className="text-orange-400" />} 
              sub="Primary Group"
            />
          </div>

          {/* Admin Tools Grid */}
          <div>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              Admin Utilities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {adminTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link 
                    key={tool.path} 
                    href={tool.path}
                    className="group relative flex flex-col justify-between bg-zinc-900/50 rounded-3xl p-6 shadow-sm border border-zinc-800 hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div>
                      <div className="flex items-start justify-between mb-6">
                        <div className="p-3.5 rounded-2xl bg-zinc-800 ring-1 ring-inset ring-white/5">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-600 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 transform group-hover:rotate-[-45deg]">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">
                        {tool.name}
                      </h3>
                      
                      <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                        {tool.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Detailed Profile Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Profile Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1 mb-4 shadow-xl shadow-indigo-900/20">
                     <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center">
                        <User className="w-10 h-10 text-indigo-400" />
                     </div>
                  </div>
                  <h3 className="text-xl font-bold text-white">{user.name}</h3>
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {user.groups?.map(g => (
                      <span key={g} className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="mt-8 space-y-4">
                  <ProfileRow label="Real Name" value={user.realname || "Not set"} />
                  <ProfileRow label="Email" value={user.email || "Hidden"} />
                  <ProfileRow label="Gender" value={user.gender || "Unknown"} />
                  <ProfileRow label="Registration" value={user.registration ? new Date(user.registration).toLocaleDateString() : "Unknown"} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend, sub }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-zinc-500 text-sm font-medium mb-1">{label}</p>
          <h4 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">{value}</h4>
        </div>
        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 group-hover:border-zinc-700 transition-colors">
          {icon}
        </div>
      </div>
      {(trend || sub) && (
        <div className="text-xs">
          {trend ? (
            <span className="text-green-400 bg-green-400/10 px-2 py-1 rounded-full">{trend}</span>
          ) : (
            <span className="text-zinc-500">{sub}</span>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-zinc-800 last:border-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-200 font-medium">{value}</span>
    </div>
  );
}
