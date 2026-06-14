"use client";

import {
  ShieldCheck, Settings, ArrowRight,
  Zap, AlertTriangle, Search, Shield,
  BarChart2, FileText, Users,
} from "lucide-react";
import Link from "next/link";

const adminTools = [
  {
    name: "Edit Counter",
    description:
      "Full user statistics: total edits, deleted edits, pages created, namespace totals, and more.",
    path: "/tools/edit-counter",
    icon: Users,
  },
  {
    name: "Top Edits",
    description:
      "User’s most edited pages (per namespace) and detailed edits on a single page.",
    path: "/tools/top-edits",
    icon: BarChart2,
  },
  {
    name: "Edit Summaries",
    description:
      "Analyzes edit summary usage over time (major/minor edits, monthly breakdown).",
    path: "/tools/edit-summaries",
    icon: FileText,
  },
  {
    name: "AntiVandal",
    description: "Real-time counter-vandalism tool for reverting bad edits.",
    path: "/tools/antivandal",
    icon: Zap,
  },
  {
    name: "Vandalism Checker",
    description: "Scan a user's recent edits for suspicious patterns and vandalism.",
    path: "/tools/vandalism-check",
    icon: AlertTriangle,
  },
  {
    name: "User Contribution Search",
    description: "Find all edits by a specific user to a single page.",
    path: "/tools/usercontributionsearch",
    icon: Search,
  },
  {
    name: "User Rights Inspector",
    description: "View user groups, rights, and rights change history logs.",
    path: "/tools/user-rights",
    icon: Shield,
  },
  {
    name: "Patroller Stats",
    description: "Statistics for patrolling/admin-like actions and activity summaries.",
    path: "/tools/patroller-stats",
    icon: Shield,
  },
];

export default function AdminTools() {
  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-indigo-500/30">
      <div className="min-h-screen">
        <header className="h-16 border-b border-zinc-800 flex items-center px-6 bg-zinc-900/20 backdrop-blur sticky top-0 z-10">
          <h2 className="font-semibold text-zinc-100">Admin Dashboard</h2>
        </header>

        <main className="p-6 max-w-7xl mx-auto space-y-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/20 p-8 md:p-12">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Justapedia Admin Tools
              </h1>
              <p className="text-indigo-200/70 max-w-2xl">
                Analytics and moderation utilities powered by the Justapedia API. No sign-in
                required.
              </p>
            </div>
          </div>

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

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-400">
              Write actions (such as reverting vandalism) require appropriate rights on
              Justapedia itself. Read-only analytics work for everyone through the public API.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
