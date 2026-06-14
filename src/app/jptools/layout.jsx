"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import {
  BarChart2, FileText, Users, Search,
  Clock, Menu, X, Activity, FilePlus,
  LayoutDashboard, Zap,
} from "lucide-react";
import { useState } from "react";

const tools = [
  { name: "JPTools Dashboard", path: "/jptools", icon: LayoutDashboard },
  { name: "Page Info", path: "/jptools/page-info", icon: FileText },
  { name: "Authorship", path: "/jptools/authorship", icon: Users },
  { name: "Largest Pages", path: "/jptools/largest-pages", icon: FileText },
  { name: "Simple Counter", path: "/jptools/simple-counter", icon: Clock },
  { name: "Citation Tool", path: "/jptools/citation", icon: Search },
  { name: "Live Recent Changes", path: "/jptools/live-rc", icon: Activity },
  { name: "New Pages Feed", path: "/jptools/new-pages", icon: FilePlus },
  { name: "Global Search", path: "/jptools/global-search", icon: Search },
  { name: "AntiVandal", path: "/tools/antivandal", icon: Zap },
  { name: "Bot Manager", path: "/bot", icon: LayoutDashboard },
];

export default function JPToolsLayout({ children }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-black flex font-sans selection:bg-blue-100 dark:selection:bg-blue-900 overflow-hidden">
      <button
        className="lg:hidden fixed top-4 right-4 z-50 p-2.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-white/10 text-zinc-600 dark:text-zinc-400 active:scale-95 transition-transform"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        className={`
        fixed inset-y-0 left-0 z-40 w-72
        lg:relative lg:block lg:m-4 lg:rounded-[2.5rem]
        bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl
        border border-white/50 dark:border-white/5 shadow-2xl lg:shadow-xl
        transform transition-all duration-500 ease-out lg:translate-x-0
        flex flex-col overflow-hidden
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="p-8 pb-4">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 bg-blue-600 rounded-2xl rotate-3 group-hover:rotate-6 transition-transform duration-300 opacity-20"></div>
              <div className="relative w-full h-full bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30 group-hover:-translate-y-1 transition-transform duration-300">
                JP
              </div>
            </div>
            <div>
              <span className="font-bold text-2xl text-zinc-900 dark:text-white block tracking-tight">
                JPTools
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium tracking-wider uppercase">
                Analytics
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto scrollbar-none hover:scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
          <p className="px-4 py-3 text-xs font-bold text-zinc-400/80 uppercase tracking-widest">
            Menu
          </p>
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = pathname === tool.path;

            return (
              <Link
                key={tool.path}
                href={tool.path}
                onClick={() => setIsOpen(false)}
                className={`
                  group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300
                  relative overflow-hidden
                  ${
                    isActive
                      ? "text-blue-600 dark:text-white bg-blue-50/80 dark:bg-blue-600/20 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                  }
                `}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
                )}
                <Icon
                  className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110 group-hover:text-blue-500"}`}
                />
                <span className="relative z-10">{tool.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 p-5 text-white shadow-lg shadow-blue-500/25 group cursor-pointer hover:shadow-blue-500/40 transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/20 transition-colors"></div>
            <p className="text-xs font-medium text-blue-100 mb-1 relative z-10">
              Need Assistance?
            </p>
            <p className="text-sm font-bold mb-3 relative z-10">Contact Support</p>
            <a
              href="mailto:skhsouravhalder@gmail.com"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-bold rounded-xl transition-all duration-300 group-hover:scale-[1.02]"
            >
              Send Email
            </a>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 min-h-screen relative flex flex-col">
        <div className="absolute inset-0 bg-grid-zinc-200/50 dark:bg-grid-zinc-800/50 bg-[size:20px_20px] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />
        <div className="px-4 lg:px-10 py-8 pb-10 max-w-7xl mx-auto w-full animate-fade-in relative z-10 flex-1">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
