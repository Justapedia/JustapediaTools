"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import {
  Shield, Zap, AlertTriangle, Search,
  BarChart2, FileText, Users,
  Menu, X, PieChart, LayoutDashboard,
} from "lucide-react";
import { useState } from "react";

const tools = [
  { name: "Admin Dashboard", path: "/tools/admin", icon: Shield },
  { name: "Edit Counter", path: "/tools/edit-counter", icon: Users },
  { name: "Top Edits", path: "/tools/top-edits", icon: BarChart2 },
  { name: "Edit Summaries", path: "/tools/edit-summaries", icon: FileText },
  { name: "AntiVandal", path: "/tools/antivandal", icon: Zap },
  { name: "Vandalism Checker", path: "/tools/vandalism-check", icon: AlertTriangle },
  { name: "User Contribution Search", path: "/tools/usercontributionsearch", icon: Search },
  { name: "User Rights Inspector", path: "/tools/user-rights", icon: PieChart },
  { name: "Patroller Stats", path: "/tools/patroller-stats", icon: PieChart },
];

export default function AdminToolsLayout({ children }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex">
      <button
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white dark:bg-zinc-900 rounded-lg shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </button>

      <aside
        className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800
        transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static
        ${isOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col
      `}
      >
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <Link href="/tools/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">
              JP
            </div>
            <span className="font-bold text-xl text-zinc-900 dark:text-white">AdminTools</span>
          </Link>
          <p className="text-xs text-zinc-500 mt-2">Justapedia Admin Suite</p>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto flex-1">
          <div className="mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <Link
              href="/jptools"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition-colors dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm w-full"
            >
              <LayoutDashboard className="w-4 h-4" />
              User Dashboard
            </Link>
          </div>

          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = pathname === tool.path;

            return (
              <Link
                key={tool.path}
                href={tool.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tool.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto flex flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </main>
    </div>
  );
}
