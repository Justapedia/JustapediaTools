"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import { 
  BarChart2, FileText, Users, Search, 
  Settings, Clock, ArrowRight, 
  Sparkles, Zap, Smartphone, Shield,
  LayoutDashboard, Server
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <main className="max-w-6xl mx-auto px-6 py-20">
        
        {/* Hero Section */}
        <header className="text-center mb-20 space-y-6">
          <div className="inline-flex items-center justify-center p-4 mb-4 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 animate-fade-in-up">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/30">
               JP
             </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-6">
            JPTools
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-medium">
            A modern statistics and utilities suite for Justapedia. <br className="hidden md:block"/>
            Click any tool below to launch it.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-6">
             <Badge icon={Sparkles} text="Justapedia API" />
             <Badge icon={Smartphone} text="Mobile-first" />
             <Badge icon={Zap} text="Fast & Accurate" />
          </div>
        </header>

        {/* Tool Links Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <ToolLink href="/bot" title="Bot" icon={Server} />
          <ToolLink href="/jptools" title="User Dashboard" icon={LayoutDashboard} />
          <ToolLink href="/tools/antivandal" title="AntiVandal" icon={Zap} />
          <ToolLink href="/tools/admin" title="Admin" icon={Shield} />
          <ToolLink href="/jptools/simple-counter" title="Simple Counter" icon={Clock} />
          <ToolLink href="/jptools/page-info" title="Page Info" icon={FileText} />
          <ToolLink href="/jptools/largest-pages" title="Largest Pages" icon={FileText} />
          <ToolLink href="/tools/automated-edits" title="Automated Edits" icon={Settings} />
          <ToolLink href="/tools/patroller-stats" title="Patroller Stats" icon={Users} />
          <ToolLink href="/jptools/authorship" title="Authorship" icon={Users} />
          <ToolLink href="/jptools/citation" title="Citation Tool" icon={Search} />
          <ToolLink href="https://justapedia.org/wiki/Main_Page" title="Main Page" icon={BarChart2} />
        </section>

        <Footer />
      </main>
    </div>
  );
}

function Badge({ icon: Icon, text, color }) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
    green: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold ${colorClasses[color]}`}>
      <Icon className="w-3.5 h-3.5" />
      {text}
    </span>
  );
}

function ToolLink({ href, title, icon: Icon }) {
  return (
    <Link
      href={href}
      className="group relative flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-zinc-50 dark:to-zinc-800/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex items-center gap-4">
        <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800">
          <Icon className="w-6 h-6 text-black dark:text-white" />
        </div>
        <span className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </span>
      </div>
      
      <div className="relative flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
        Open <ArrowRight className="w-4 h-4 ml-1" />
      </div>
    </Link>
  );
}
