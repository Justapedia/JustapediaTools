"use client";

import Link from "next/link";
import {
  BarChart2, FileText, Users, Search,
  Clock, ArrowRight, Activity, FilePlus,
} from "lucide-react";

const tools = [
  {
    name: "Page Info",
    description:
      "Deep page revision analytics: editors, edit types, prose stats, top editors, and bots.",
    path: "/jptools/page-info",
    icon: FileText,
  },
  {
    name: "Authorship",
    description:
      "Authorship attribution by character count (powered by WikiWho logic via API).",
    path: "/jptools/authorship",
    icon: Users,
  },
  {
    name: "Largest Pages",
    description: "Lists largest pages by wikitext byte size with filters.",
    path: "/jptools/largest-pages",
    icon: FileText,
  },
  {
    name: "Simple Counter",
    description: "Fast, lightweight edit counter for quick lookup.",
    path: "/jptools/simple-counter",
    icon: Clock,
  },
  {
    name: "Citation Tool",
    description:
      "Generate citations from DOI, PMID, S2CID, or URL. Fixes common errors automatically.",
    path: "/jptools/citation",
    icon: Search,
  },
  {
    name: "Live Recent Changes",
    description: "Real-time stream of wiki edits, new pages, and logs.",
    path: "/jptools/live-rc",
    icon: Activity,
  },
  {
    name: "New Pages Feed",
    description: "Monitor newly created articles with filters for size and user.",
    path: "/jptools/new-pages",
    icon: FilePlus,
  },
  {
    name: "Global Search",
    description: "Search across all namespaces and pages on Justapedia.",
    path: "/jptools/global-search",
    icon: Search,
  },
];

export default function JPToolsDashboard() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 md:p-12 text-white shadow-2xl ring-1 ring-white/10">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-100 font-bold text-xs uppercase tracking-widest mb-6 backdrop-blur-sm">
            <BarChart2 className="w-3 h-3" />
            Analytics Suite
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
            JPTools{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">
              Dashboard
            </span>
          </h1>

          <p className="text-blue-100 text-lg md:text-xl mb-8 leading-relaxed font-medium">
            A modern, user-friendly statistics suite for Justapedia. Powered by the
            Justapedia API to provide fast, accurate, and detailed analytics.
          </p>

          <div className="flex flex-wrap gap-3">
            <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-100 text-sm font-bold backdrop-blur-md">
              Justapedia API
            </div>
            <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-100 text-sm font-bold backdrop-blur-md">
              Mobile First
            </div>
            <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-100 text-sm font-bold backdrop-blur-md">
              Real-time Stats
            </div>
          </div>
        </div>

        <div className="absolute right-0 top-0 h-full w-2/3 bg-gradient-to-l from-white/10 via-white/5 to-transparent pointer-events-none" />
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-white/10 blur-[100px] rounded-full pointer-events-none mix-blend-overlay" />
        <div className="absolute right-1/4 bottom-0 w-64 h-64 bg-indigo-500/30 blur-[80px] rounded-full pointer-events-none mix-blend-overlay" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.path}
              href={tool.path}
              className="group relative flex flex-col justify-between bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-50/50 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div>
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 ring-1 ring-inset ring-black/5 dark:ring-white/5">
                    <Icon className="w-6 h-6 text-black dark:text-white" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-300 dark:text-zinc-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 transform group-hover:rotate-[-45deg]">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {tool.name}
                </h3>

                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed font-medium">
                  {tool.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
