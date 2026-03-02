"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import { 
  BarChart2, FileText, Users, Search, 
  Settings, Clock, Menu, X, Shield,
  LogOut, User, ChevronDown, Activity, FilePlus,
  LayoutDashboard, Zap
} from "lucide-react";

import { useState, useRef, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import LoginModal from "@/components/LoginModal";

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

function JPToolsContent({ children }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Close user menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-black flex font-sans selection:bg-blue-100 dark:selection:bg-blue-900 overflow-hidden">
      {/* Login Modal */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}

      {/* Mobile Sidebar Toggle */}
      <button 
        className="lg:hidden fixed top-4 right-4 z-50 p-2.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-white/10 text-zinc-600 dark:text-zinc-400 active:scale-95 transition-transform"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 
        lg:relative lg:block lg:m-4 lg:rounded-[2.5rem]
        bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl
        border border-white/50 dark:border-white/5 shadow-2xl lg:shadow-xl
        transform transition-all duration-500 ease-out lg:translate-x-0
        flex flex-col overflow-hidden
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo Section */}
        <div className="p-8 pb-4">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 bg-blue-600 rounded-2xl rotate-3 group-hover:rotate-6 transition-transform duration-300 opacity-20"></div>
              <div className="relative w-full h-full bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30 group-hover:-translate-y-1 transition-transform duration-300">
                JP
              </div>
            </div>
            <div>
              <span className="font-bold text-2xl text-zinc-900 dark:text-white block tracking-tight">JPTools</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium tracking-wider uppercase">Analytics</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto scrollbar-none hover:scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
          {loading ? (
            <div className="space-y-3 mt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : user ? (
            <>
              <p className="px-4 py-3 text-xs font-bold text-zinc-400/80 uppercase tracking-widest">Menu</p>
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
                      ${isActive 
                        ? "text-blue-600 dark:text-white bg-blue-50/80 dark:bg-blue-600/20 shadow-sm" 
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                      }
                    `}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
                    )}
                    <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110 group-hover:text-blue-500"}`} />
                    <span className="relative z-10">{tool.name}</span>
                    
                    {isActive && (
                      <div className="absolute inset-0 bg-blue-100/10 dark:bg-blue-500/5 animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </>
          ) : (
            <div className="px-4 py-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                <Shield className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">Login Required</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Please sign in to access the analytics tools.
              </p>
            </div>
          )}
        </nav>

        {/* Support Card */}
        <div className="p-4 mt-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 p-5 text-white shadow-lg shadow-blue-500/25 group cursor-pointer hover:shadow-blue-500/40 transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/20 transition-colors"></div>
            
            <p className="text-xs font-medium text-blue-100 mb-1 relative z-10">Need Assistance?</p>
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

      {/* Main Content */}
      <main className="flex-1 min-w-0 min-h-screen relative flex flex-col">
        {/* Top Bar with Login */}
        <header className="px-4 lg:px-10 py-4 flex justify-end items-center relative z-20">
            {user ? (
                <div className="relative" ref={userMenuRef}>
                    <button 
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full pl-2 pr-4 py-1.5 shadow-sm hover:shadow-md transition-all"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                            {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{user.name}</span>
                        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showUserMenu && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
                                        {user.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Signed in as</p>
                                        <p className="font-bold text-zinc-900 dark:text-white truncate text-sm">{user.name}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
                                        <div className="font-bold text-zinc-900 dark:text-zinc-200 text-sm">{user.id || '-'}</div>
                                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">ID</div>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
                                        <div className="font-bold text-zinc-900 dark:text-zinc-200 text-sm">{user.editcount?.toLocaleString() || '0'}</div>
                                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Edits</div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-2">
                                <a 
                                    href={`https://justapedia.org/wiki/User:${encodeURIComponent(user.name)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left"
                                >
                                    <User className="w-4 h-4" />
                                    Profile
                                </a>
                                <a 
                                    href="https://justapedia.org/wiki/Special:Preferences"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left"
                                >
                                    <Settings className="w-4 h-4" />
                                    Settings
                                </a>
                                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                                <button 
                                    onClick={() => {
                                        logout();
                                        setShowUserMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-left"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <button 
                    onClick={() => setShowLoginModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                    <User className="w-4 h-4" />
                    Login
                </button>
            )}
        </header>

        <div className="absolute inset-0 bg-grid-zinc-200/50 dark:bg-grid-zinc-800/50 bg-[size:20px_20px] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />
        <div className="px-4 lg:px-10 pb-10 max-w-7xl mx-auto w-full animate-fade-in relative z-10 flex-1">
          {loading ? (
             <div className="flex justify-center items-center min-h-[50vh]">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
             </div>
          ) : !user && pathname !== '/jptools' ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                <Shield className="w-12 h-12 text-zinc-400" />
              </div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">Access Restricted</h1>
              <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-8">
                You must be logged in to access this tool. Please sign in using the button above to continue.
              </p>
              <button 
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/25"
              >
                Login to Continue
              </button>
            </div>
          ) : (
            children
          )}
        </div>
        <Footer />
      </main>
    </div>
  );
}

export default function JPToolsLayout({ children }) {
    return (
        <AuthProvider>
            <JPToolsContent>{children}</JPToolsContent>
        </AuthProvider>
    );
}