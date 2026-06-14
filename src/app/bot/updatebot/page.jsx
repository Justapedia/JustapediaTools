"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Square, RefreshCw, AlertTriangle, CheckCircle,
  FileText,
} from "lucide-react";
import axios from "axios";
import { fetchRandomInfoboxArticle, processInfoboxSync, saveEdit } from "@/utils/updateBotLogic";

export default function UpdateBotPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Bot Options
  const [autoSave, setAutoSave] = useState(false); 
  const [processAll, setProcessAll] = useState(false); 
  const [targetCategories, setTargetCategories] = useState("");
  const [showCategoryPolicy, setShowCategoryPolicy] = useState(false); 
  
  // Pending Review
  const [pendingEdit, setPendingEdit] = useState(null); 
  
  const [stats, setStats] = useState({
    edits: 0,
    registration: "Loading...",
    groups: []
  });
  const [logs, setLogs] = useState([
    { id: 1, action: "System Check", user: "System", time: "10:00 AM", status: "success" },
  ]);

  // Ref to control loop
  const stopSignal = useRef(false);
  const visitedArticles = useRef(new Set()); // Track visited articles to avoid loops

  const addLog = (action, username, status, details = "") => {
    const newLog = {
      id: Date.now() + Math.random(),
      action,
      user: username,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status,
      details
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Clear visited cache if it gets too big to prevent memory issues during long runs
  useEffect(() => {
    if (visitedArticles.current.size > 5000) {
        visitedArticles.current.clear();
        setTimeout(() => {
            addLog("Cleared visited articles cache for memory optimization", "System", "info");
        }, 0);
    }
  }, [stats.edits]); // Check whenever edits count updates

  // Fetch Bot Stats
  const fetchStats = useCallback(async () => {
      try {
        const res = await axios.get("/api/justapedia", {
          params: {
            action: "query",
            list: "users",
            ususers: "Sourav bot",
            usprop: "editcount|registration|groups",
            format: "json"
          }
        });
        const botUser = res.data?.query?.users?.[0];
        if (botUser) {
          setStats({
            edits: botUser.editcount || 0,
            registration: botUser.registration ? new Date(botUser.registration).toLocaleDateString() : "N/A",
            groups: botUser.groups || []
          });
        }
      } catch (e) {
        console.error("Error fetching bot stats", e);
      }
  }, []);

  useEffect(() => {
    setTimeout(() => fetchStats(), 0);
    // Poll every 30s
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const runBotCycle = async () => {
    if (stopSignal.current) {
        setIsRunning(false);
        setIsProcessing(false);
        return;
    }

    setIsProcessing(true);
    addLog("Scanning for articles with Infoboxes...", "Bot", "info");

    try {
        // 1. Fetch
        const categories = targetCategories.split('\n').filter(c => c.trim());
        const article = await fetchRandomInfoboxArticle(categories, Array.from(visitedArticles.current));

        if (!article) {
            addLog("Failed to fetch article or no candidates found", "Bot", "warning");
            
            if (processAll && !stopSignal.current) {
                setTimeout(runBotCycle, 2000); // Retry faster (2s)
            } else {
                setIsRunning(false);
            }
            return;
        }
        addLog(`Analyzing: ${article.title}`, "Bot", "info");

        // 2. Process
        const result = await processInfoboxSync(article.content, article.title);
        
        if (!result.hasChanges) {
            addLog(`Skipped ${article.title}: ${result.reason}`, "Bot", "info");
            visitedArticles.current.add(article.title); // Add to visited so we don't pick it again immediately

            if (processAll && !stopSignal.current) {
                setTimeout(runBotCycle, 100); // Turbo: 100ms
            } else {
                setIsRunning(false);
            }
            return;
        }

        // 3. Handle Changes
        const summary = `Bot: ${result.changes.join(", ")}`;
        
        if (autoSave) {
            addLog(`Syncing Infobox for ${article.title}...`, "Bot", "warning");
            const saveRes = await saveEdit(article.title, result.newContent, summary, true);
            
            if (saveRes.success) {
                addLog(`Saved: ${article.title}`, "Bot", "success");
                visitedArticles.current.add(article.title); // Mark as visited
                fetchStats(); 
            } else {
                addLog(`Save failed: ${saveRes.error}`, "Bot", "error");
            }

            if (processAll && !stopSignal.current) {
                setTimeout(runBotCycle, 500); // Turbo: 500ms after save
            } else {
                setIsRunning(false);
            }

        } else {
            // Manual Review mode
            setPendingEdit({
                title: article.title,
                content: result.newContent,
                original: article.content,
                summary: summary,
                changes: result.changes,
                originalInfobox: result.originalInfobox,
                newInfobox: result.newInfobox
            });
            setIsProcessing(false);
        }

    } catch (error) {
        addLog(`Error in bot cycle: ${error.message}`, "System", "error");
        
        // Auto-retry on error in continuous mode
        if (processAll && !stopSignal.current) {
            addLog("Retrying in 2 seconds...", "System", "info");
            setTimeout(runBotCycle, 2000);
        } else {
            setIsRunning(false);
        }
    }
  };

  const handleStart = () => {
    stopSignal.current = false;
    setIsRunning(true);
    addLog("Bot Started", "Operator", "success", "Start command initiated");
    runBotCycle();
  };

  const handleStop = () => {
    stopSignal.current = true;
    setIsRunning(false);
    addLog("Stopping bot...", "Operator", "warning", "Stop command initiated");
  };

  const handleApproveEdit = async () => {
    if (!pendingEdit) return;

    addLog(`Approving edit for ${pendingEdit.title}...`, "Operator", "success");
    const saveRes = await saveEdit(pendingEdit.title, pendingEdit.content, pendingEdit.summary, true);
    
    if (saveRes.success) {
        addLog(`Saved: ${pendingEdit.title}`, "Bot", "success");
        fetchStats();
    } else {
        addLog(`Save failed: ${saveRes.error}`, "Bot", "error");
    }
    
    setPendingEdit(null);
    
    if (processAll && !stopSignal.current) {
        setIsRunning(true);
        runBotCycle();
    } else {
        setIsRunning(false);
    }
  };

  const handleRejectEdit = () => {
    addLog(`Skipped: ${pendingEdit.title}`, "Operator", "warning");
    setPendingEdit(null);
    
    if (processAll && !stopSignal.current) {
        setIsRunning(true);
        runBotCycle();
    } else {
        setIsRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">Update Bot Manager</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              isRunning 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}>
              {isRunning ? "Running" : "Idle"}
            </span>
          </div>
          <div className="text-zinc-400 max-w-2xl text-sm space-y-4">
            <p className="leading-relaxed">
              Syncs infobox data from English Wikipedia into Justapedia articles. Configure
              categories, review proposed changes, and run in auto-save or manual review mode.
            </p>
          </div>
        </div>

        {/* Control Panel */}
        <div className="flex flex-col gap-4">
            {/* Options */}
            <div className="flex items-center gap-4 bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <label className="flex items-center gap-2 cursor-pointer px-2 text-sm text-zinc-300">
                    <input 
                        type="checkbox" 
                        checked={autoSave}
                        onChange={(e) => setAutoSave(e.target.checked)}
                        className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-emerald-500/20"
                    />
                    Auto-Save (Permission: No)
                </label>
                <div className="w-px h-6 bg-zinc-800"></div>
                <label className="flex items-center gap-2 cursor-pointer px-2 text-sm text-zinc-300">
                    <input 
                        type="checkbox" 
                        checked={processAll}
                        onChange={(e) => setProcessAll(e.target.checked)}
                        className="rounded bg-zinc-800 border-zinc-700 text-blue-500 focus:ring-blue-500/20"
                    />
                    Enable Continuous / Turbo Mode
                </label>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 bg-zinc-900 p-2 rounded-xl border border-zinc-800 h-fit justify-end">
              {!isRunning ? (
                  <button
                    onClick={handleStart}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                  >
                    <Play className="w-4 h-4" /> {processAll ? "Start Continuous Mode" : "Start Bot"}
                  </button>
              ) : (
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20"
                  >
                    <Square className="w-4 h-4 fill-current" /> Stop Bot
                  </button>
              )}
            </div>
        </div>
      </div>

      {/* Pending Review Modal/Card */}
      {pendingEdit && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-amber-500 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Review Infobox Changes: {pendingEdit.title}
                  </h3>
                  <div className="flex gap-2">
                      <button 
                        onClick={handleRejectEdit}
                        className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
                      >
                          Skip
                      </button>
                      <button 
                        onClick={handleApproveEdit}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
                      >
                          <CheckCircle className="w-4 h-4" /> Approve & Save
                      </button>
                  </div>
              </div>
              
              <div className="space-y-4">
                  
                  {/* Infobox Diff Preview */}
                  {pendingEdit.originalInfobox && pendingEdit.newInfobox ? (
                     <div className="grid grid-cols-2 gap-4 h-[400px]">
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 overflow-auto">
                          <div className="text-xs font-bold text-red-400 mb-2 sticky top-0 bg-zinc-950 pb-2 border-b border-zinc-900">Justapedia Infobox (Original)</div>
                          <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap">{pendingEdit.originalInfobox}</pre>
                      </div>
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 overflow-auto">
                          <div className="text-xs font-bold text-emerald-400 mb-2 sticky top-0 bg-zinc-950 pb-2 border-b border-zinc-900">EnWiki Infobox (New)</div>
                          <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">{pendingEdit.newInfobox}</pre>
                      </div>
                  </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 h-[300px]">
                        <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 overflow-auto">
                            <div className="text-xs font-bold text-red-400 mb-2 sticky top-0 bg-zinc-950 pb-2 border-b border-zinc-900">Original Content</div>
                            <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap">{pendingEdit.original}</pre>
                        </div>
                        <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 overflow-auto">
                            <div className="text-xs font-bold text-emerald-400 mb-2 sticky top-0 bg-zinc-950 pb-2 border-b border-zinc-900">New Content</div>
                            <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">{pendingEdit.content}</pre>
                        </div>
                    </div>
                  )}
              </div>
          </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Controls */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
             <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-500" />
                Control Panel
             </h3>
             
             <div className="space-y-6">
                {/* Category Filter Input */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Target Categories (Optional)</label>
                    <textarea 
                        className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-blue-500 outline-none resize-none font-mono"
                        placeholder="One category per line...&#10;e.g. Living people&#10;e.g. 2024 films&#10;(Leave empty for random site-wide scan)"
                        value={targetCategories}
                        onChange={(e) => setTargetCategories(e.target.value)}
                    />
                    <p className="text-xs text-zinc-600">
                        Leave empty to scan random articles from the entire wiki.
                    </p>
                </div>

                {/* Auto-Save Toggle */}
                <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div>
                        <div className="text-sm font-medium text-white">Auto-Save Mode</div>
                        <div className="text-xs text-zinc-500">Automatically save changes (Required for high-speed operation)</div>
                    </div>
                    <button 
                        onClick={() => setAutoSave(!autoSave)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${autoSave ? "bg-emerald-600" : "bg-zinc-700"}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${autoSave ? "left-7" : "left-1"}`} />
                    </button>
                </div>
             </div>
          </div>
        </div>
        
        {/* Full Width: Mission & Scope */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Update Infobox 
            </h3>
            <div className="text-sm text-zinc-400">
                <div className="space-y-2">
                    <h4 className="font-bold text-zinc-300 uppercase text-xs tracking-wider">Goal</h4>
                    <p>The goal is Infobox consistency only, not full article synchronization.</p>
                </div>
            </div>
        </div>

        {/* Logs */}
        <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-[400px] flex flex-col">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" /> Activity Log
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs pr-2">
                {logs.map(log => (
                    <div key={log.id} className="flex gap-4 p-2 rounded bg-zinc-950/50 border border-zinc-900/50">
                        <span className="text-zinc-500 w-20 shrink-0">{log.time}</span>
                        <span className={`w-24 shrink-0 font-bold ${
                            log.status === "success" ? "text-emerald-400" :
                            log.status === "error" ? "text-red-400" :
                            log.status === "warning" ? "text-amber-400" :
                            "text-blue-400"
                        }`}>
                            [{log.status.toUpperCase()}]
                        </span>
                        <span className="text-zinc-300 flex-1">{log.action}</span>
                        <span className="text-zinc-600">{log.user}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 pt-8 mt-12 text-center text-zinc-500 text-sm space-y-2">
        <p>Developed by <span className="text-zinc-300 font-medium">Sourav</span></p>
        <p>Contact: <a href="mailto:skhsouravhalder@gmail.com" className="text-blue-400 hover:underline">skhsouravhalder@gmail.com</a></p>
        <p>Copyright © 2026 by the Tools contributors.</p>
        <p className="text-xs text-zinc-600 max-w-3xl mx-auto mt-4">
          JPTools (also known as Justapedia Tools) is free and open-source software licensed under the GNU General Public License, version 3 or later (GPL-3.0+).
        </p>
      </div>
    </div>
  );
}
