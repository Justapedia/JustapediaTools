"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import { 
  Shield, Zap, AlertTriangle, Search, 
  Activity, FilePlus, Settings, BarChart2,
  Menu, X, Lock, PieChart, LogOut, User,
  FileText, Users, LayoutDashboard
} from "lucide-react";
import { useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import LoginScreen from "@/components/LoginScreen";

const tools = [
  { name: "Admin Dashboard", path: "/tools/admin", icon: Shield },
  { name: "Edit Counter", path: "/tools/edit-counter", icon: Users },
  { name: "Top Edits", path: "/tools/top-edits", icon: BarChart2 },
  { name: "Edit Summaries", path: "/tools/edit-summaries", icon: FileText },
  { name: "AntiVandal", path: "/tools/antivandal", icon: Zap },
  { name: "Vandalism Checker", path: "/tools/vandalism-check", icon: AlertTriangle },
  { name: "User Contribution Search", path: "/tools/usercontributionsearch", icon: Search },
  { name: "User Rights Inspector", path: "/tools/user-rights", icon: Lock },
  { name: "Patroller Stats", path: "/tools/patroller-stats", icon: PieChart },
];

function AdminToolsContent({ children }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading, logout } = useAuth();

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // 2. Not Logged In -> Show Login Screen
  if (!user) {
    return <LoginScreen />;
  }

  // 3. Permission Check
  const hasAccess = user.groups?.some(g => ["sysop", "interface-admin", "bureaucrat", "steward"].includes(g));

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center shadow-xl">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-600 dark:text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Access Restricted</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">
            This area is restricted to Administrators and Interface Administrators only. Your account does not have the required permissions.
          </p>
          
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl mb-8 border border-zinc-100 dark:border-zinc-800">
             <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Current Account</div>
             <div className="font-bold text-lg text-zinc-900 dark:text-white">{user.name}</div>
             <div className="text-xs text-zinc-400 mt-1 flex flex-wrap gap-1 justify-center">
                {user.groups?.map(g => (
                  <span key={g} className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded">{g}</span>
                ))}
             </div>
          </div>

          <button 
            onClick={logout}
            className="w-full bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // 4. Logged In & Authorized -> Show Tools Layout
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex">
      {/* Mobile Sidebar Toggle */}
      <button 
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white dark:bg-zinc-900 rounded-lg shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800
        transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static
        ${isOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col
      `}>
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <Link href="/tools/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">
              JP
            </div>
            <span className="font-bold text-xl text-zinc-900 dark:text-white">AdminTools</span>
          </Link>
          <p className="text-xs text-zinc-500 mt-2">Justapedia Admin Suite</p>
        </div>

        {/* User Profile Summary in Sidebar */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                {user.name?.charAt(0).toUpperCase()}
             </div>
             <div className="overflow-hidden">
                <div className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{user.name}</div>
                <div className="text-xs text-zinc-500 truncate">ID: {user.id}</div>
             </div>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs">
             <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-700 text-center">
                <div className="font-bold text-zinc-900 dark:text-zinc-200">{user.editcount?.toLocaleString()}</div>
                <div className="text-zinc-500">Edits</div>
             </div>
          </div>
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

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
            <button 
              onClick={logout}
              className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto flex flex-col">
        <div className="flex-1">
           {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}

export default function AdminToolsLayout({ children }) {
  return (
    <AuthProvider>
      <AdminToolsContent>{children}</AdminToolsContent>
    </AuthProvider>
  );
}
