"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Activity, Play, Pause, Filter, Shield, User, FileText, ExternalLink } from "lucide-react";

export default function LiveRecentChanges() {
  const [changes, setChanges] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [filters, setFilters] = useState({
    bots: false,
    minor: true,
    new: true,
    log: true
  });
  const lastTimestampRef = useRef(null);
  const intervalRef = useRef(null);

  const stopPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const fetchChanges = useCallback(async (isInitial = false) => {
    try {
      const params = {
        action: "query",
        list: "recentchanges",
        rcprop: "title|ids|sizes|flags|user|timestamp|comment|tags",
        rclimit: isInitial ? 20 : 10,
      format: "json",
      // origin: "*"
      };

      if (lastTimestampRef.current && !isInitial) {
        params.rcend = lastTimestampRef.current;
      }

      const res = await axios.get("/api/justapedia", { params });
      const newBatch = res.data?.query?.recentchanges || [];

      setChanges(prev => {
        // Merge and de-duplicate
        const existingIds = new Set(prev.map(c => c.rcid));
        const uniqueNew = newBatch.filter(c => !existingIds.has(c.rcid));
        
        if (uniqueNew.length === 0) return prev;

        const combined = [...uniqueNew, ...prev].slice(0, 100); // Keep last 100
        
        if (uniqueNew.length > 0) {
           lastTimestampRef.current = uniqueNew[0].timestamp;
        }
        
        return combined;
      });

    } catch (err) {
      console.error("Polling error", err);
      setIsPlaying(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    setTimeout(() => fetchChanges(true), 0);
    return () => stopPolling();
  }, [fetchChanges]);

  // Polling effect
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => fetchChanges(false), 5000);
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [isPlaying, filters, fetchChanges]);

  const filteredChanges = changes.filter(c => {
    if (!filters.bots && c.bot !== undefined) return false;
    if (!filters.minor && c.minor !== undefined) return false;
    // Type filtering
    if (!filters.new && c.type === "new") return false;
    if (!filters.log && c.type === "log") return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
          <Activity className="w-8 h-8 text-red-500" /> Live Recent Changes
        </h1>
        
        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-colors ${
              isPlaying 
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" 
                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? "Pause Stream" : "Start Stream"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filters
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={filters.bots} 
                  onChange={e => setFilters({...filters, bots: e.target.checked})}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Show Bots</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={filters.minor} 
                  onChange={e => setFilters({...filters, minor: e.target.checked})}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Show Minor Edits</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={filters.new} 
                  onChange={e => setFilters({...filters, new: e.target.checked})}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Show New Pages</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={filters.log} 
                  onChange={e => setFilters({...filters, log: e.target.checked})}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Show Logs</span>
              </label>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
            <p>
              Updates every 5 seconds when active. Showing last {filteredChanges.length} events.
            </p>
          </div>
        </div>

        {/* Feed */}
        <div className="lg:col-span-3 space-y-3">
          {filteredChanges.map((change) => (
            <div 
              key={change.rcid} 
              className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <div className="mt-1">
                {change.type === "new" && <FileText className="w-5 h-5 text-green-500" />}
                {change.type === "log" && <Shield className="w-5 h-5 text-purple-500" />}
                {change.type === "edit" && <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <a 
                    href={`https://justapedia.org/wiki/${encodeURIComponent(change.title)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline truncate"
                  >
                    {change.title}
                  </a>
                  
                  <div className="flex items-center gap-1 text-xs">
                    {change.minor !== undefined && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-500">m</span>
                    )}
                    {change.bot !== undefined && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold">b</span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded font-mono ${
                      change.newlen - change.oldlen > 0 
                        ? "text-green-600 bg-green-50 dark:bg-green-900/20" 
                        : change.newlen - change.oldlen < 0 
                          ? "text-red-600 bg-red-50 dark:bg-red-900/20" 
                          : "text-zinc-500 bg-zinc-50 dark:bg-zinc-800"
                    }`}>
                      {change.newlen - change.oldlen > 0 ? "+" : ""}
                      {change.newlen - change.oldlen}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
                  <User className="w-3 h-3" />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{change.user}</span>
                  <span className="text-zinc-300">•</span>
                  <span>{new Date(change.timestamp).toLocaleTimeString()}</span>
                </div>

                {change.comment && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 italic bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded">
                    &quot;{change.comment}&quot;
                  </p>
                )}
              </div>
              
              <a 
                href={`https://justapedia.org/wiki/index.php?diff=${change.revid}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-zinc-400 hover:text-blue-500 transition-colors"
                title="View Diff"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))}
          
          {filteredChanges.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              Waiting for new changes...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
