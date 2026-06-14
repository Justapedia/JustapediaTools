"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  ShieldAlert, RefreshCw, Play, Pause,
  RotateCcw, Check, X, AlertTriangle,
  ExternalLink, User, Clock, FileText,
  Settings, Zap, Trash2,
} from "lucide-react";

export default function AntiVandal() {
  const [csrfToken, setCsrfToken] = useState("");

  const [isActive, setIsActive] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentEdit, setCurrentEdit] = useState(null);
  const [diffHtml, setDiffHtml] = useState(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [stats, setStats] = useState({ scanned: 0, reverted: 0, ignored: 0 });

  const fetchCsrfToken = useCallback(async () => {
    try {
        // Try to get rollback token first
        let csrfRes = await axios.get("/api/justapedia", {
            params: {
              action: "query",
              meta: "tokens",
              type: "rollback",
              format: "json",
              _: Date.now()
            },
            headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
            withCredentials: true
        });
        
        let token = csrfRes.data?.query?.tokens?.rollbacktoken;
        
        // Fallback to csrf token if rollback token is missing or error
        if (!token || token === "+\\") {
            console.log("Rollback token missing, fetching CSRF token...");
            csrfRes = await axios.get("/api/justapedia", {
                params: {
                  action: "query",
                  meta: "tokens",
                  type: "csrf",
                  format: "json",
                  _: Date.now()
                },
                headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
                withCredentials: true
            });
            token = csrfRes.data?.query?.tokens?.csrftoken;
        }

        console.log("Fetched Action Token:", token);
        setCsrfToken(token);
        return token;
    } catch (e) {
        console.warn("Failed to fetch token", e);
        return null;
    }
  }, []);

  useEffect(() => {
    fetchCsrfToken();
  }, [fetchCsrfToken]);

  const analyzeEdit = useCallback((edit) => {
    let score = 0;
    const issues = [];

    // Heuristic 1: Large Deletion
    const diffSize = (edit.newlen || 0) - (edit.oldlen || 0);
    if (diffSize < -500) {
      score += 40;
      issues.push("Large Deletion");
    }

    // Heuristic 2: Bad Words
    const badWords = ["vandal", "stupid", "test", "haha", "poop"];
    if (badWords.some(w => (edit.comment || "").toLowerCase().includes(w))) {
      score += 30;
      issues.push("Suspicious Summary");
    }

    // Heuristic 3: Anonymous User (IP)
    if (!edit.user || /^\d+\.\d+\.\d+\.\d+$/.test(edit.user)) {
      score += 10;
    }

    // Heuristic 4: No Summary
    if (!edit.comment) {
      score += 10;
    }

    // Heuristic 5: Tags
    if (edit.tags?.includes("mw-reverted")) {
      score += 20;
      issues.push("Previously Reverted");
    }

    return { ...edit, score, issues };
  }, []);

  const fetchRecentChanges = useCallback(async () => {
    try {
      const res = await axios.get("/api/justapedia", {
        params: {
          action: "query",
          list: "recentchanges",
          rcprop: "title|ids|user|timestamp|comment|tags|flags|sizes",
          rclimit: 20,
          rctype: "edit|new",
          rcshow: "!bot", // Exclude bots
          format: "json"
        }
      });

      const newEdits = res.data?.query?.recentchanges || [];
      
      setQueue(prevQueue => {
        const existingIds = new Set(prevQueue.map(e => e.rcid));
        const uniqueNewEdits = newEdits
          .filter(e => !existingIds.has(e.rcid))
          .map(analyzeEdit) // Apply heuristic scoring
          .sort((a, b) => b.score - a.score); // Sort by risk score

        if (uniqueNewEdits.length === 0) return prevQueue;

        setStats(s => ({ ...s, scanned: s.scanned + uniqueNewEdits.length }));
        return [...prevQueue, ...uniqueNewEdits].slice(0, 50); // Keep max 50
      });
    } catch (err) {
      console.error("Failed to fetch changes", err);
    }
  }, [analyzeEdit]);

  // Polling Interval

  useEffect(() => {
    let interval;
    if (isActive) {
      fetchRecentChanges(); // Initial fetch
      interval = setInterval(fetchRecentChanges, 5000); // Poll every 5s
    }
    return () => clearInterval(interval);
  }, [isActive, fetchRecentChanges]);

  // Auto-select first in queue if none selected
  useEffect(() => {
    if (!currentEdit && queue.length > 0) {
      selectEdit(queue[0]);
    }
  }, [queue, currentEdit]);

  // Fetch Diff when edit selected
  useEffect(() => {
    if (currentEdit) {
      fetchDiff(currentEdit);
    } else {
      setDiffHtml(null);
    }
  }, [currentEdit]);

  const fetchDiff = async (edit) => {
    setLoadingDiff(true);
    try {
      const res = await axios.get("/api/justapedia", {
        params: {
          action: "compare",
          fromrev: edit.old_revid,
          torev: edit.revid,
          format: "json"
        }
      });
      setDiffHtml(res.data?.compare?.["*"] || "<div>No diff available</div>");
    } catch (err) {
      setDiffHtml("<div>Failed to load diff</div>");
    } finally {
      setLoadingDiff(false);
    }
  };

  const selectEdit = (edit) => {
    setCurrentEdit(edit);
  };

  const handleAction = async (action) => {
    if (!currentEdit) return;

    if (action === "revert") {
      let activeToken = csrfToken;
      
      // If no token, try to fetch one
      if (!activeToken) {
        activeToken = await fetchCsrfToken();
        if (!activeToken) {
          alert("Session token missing. Write actions require appropriate Justapedia rights.");
          return;
        }
      }

      // Check for rollback permission
      const hasRollback = false;

      const performRollback = async (tokenToUse) => {
        const params = new URLSearchParams();
        params.append("action", "rollback");
        params.append("title", currentEdit.title);
        params.append("user", currentEdit.user);
        params.append("token", tokenToUse);
        params.append("format", "json");

        return await axios.post("/api/justapedia", params, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          withCredentials: true
        });
      };

      const performUndo = async (tokenToUse) => {
        const params = new URLSearchParams();
        params.append("action", "edit");
        params.append("title", currentEdit.title);
        params.append("undo", currentEdit.revid);
        params.append("summary", `Undid revision ${currentEdit.revid} by [[User:${currentEdit.user}|${currentEdit.user}]] ([[JP:AV|AntiVandal]])`);
        params.append("token", tokenToUse); // Note: Undo needs CSRF token, not Rollback token. 
        params.append("format", "json");
        
        // If we fetched a rollback token, we might need a CSRF token instead for Undo.
        // But in our fetchCsrfToken logic, we try rollback then csrf. 
        // If the token is specifically a rollback token, it might fail for edit.
        // Ideally we should ensure we have a CSRF token for undo.
        // For simplicity, we'll try with the current token, and if it fails with badtoken, we fetch a CSRF specific one.

        return await axios.post("/api/justapedia", params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            withCredentials: true
        });
      };

      try {
        let res;
        
        if (hasRollback) {
            // Attempt Rollback
            res = await performRollback(activeToken);

            // Retry if token is bad
            if (res.data?.error?.code === 'badtoken' || (res.data?.error?.info && res.data.error.info.includes("token"))) {
                console.log("Token invalid, refreshing...");
                activeToken = await fetchCsrfToken(); // This fetches rollback token primarily
                if (activeToken) {
                    res = await performRollback(activeToken);
                }
            }

            // Fallback to Undo if permission denied or other non-fatal errors
            if (res.data?.error?.code === 'permissiondenied' || res.data?.error?.code === 'unknown_action') {
                console.warn("Rollback failed (permission/action), falling back to Undo...");
                // We need a CSRF token for undo, fetch one specifically
                const csrfRes = await axios.get("/api/justapedia", {
                    params: { action: "query", meta: "tokens", type: "csrf", format: "json", _: Date.now() },
                    headers: { "Cache-Control": "no-cache" },
                    withCredentials: true
                });
                const csrfTokenForUndo = csrfRes.data?.query?.tokens?.csrftoken;
                if (csrfTokenForUndo) {
                    res = await performUndo(csrfTokenForUndo);
                }
            }
        } else {
            // No rollback rights, go straight to Undo
            console.log("User lacks rollback rights, using Undo...");
             // We need a CSRF token for undo, fetch one specifically
             const csrfRes = await axios.get("/api/justapedia", {
                params: { action: "query", meta: "tokens", type: "csrf", format: "json", _: Date.now() },
                headers: { "Cache-Control": "no-cache" },
                withCredentials: true
            });
            const csrfTokenForUndo = csrfRes.data?.query?.tokens?.csrftoken;
            if (csrfTokenForUndo) {
                res = await performUndo(csrfTokenForUndo);
            } else {
                throw new Error("Could not fetch CSRF token for Undo");
            }
        }

        if (res.data?.error) {
          // Handle specific "onlyauthor" error (cannot rollback page creation)
          if (res.data.error.code === 'onlyauthor') {
            console.warn("Rollback failed (only author), attempting Undo...");
            
            try {
                // We need a CSRF token for undo
                const csrfRes = await axios.get("/api/justapedia", {
                    params: { action: "query", meta: "tokens", type: "csrf", format: "json", _: Date.now() },
                    headers: { "Cache-Control": "no-cache" },
                    withCredentials: true
                });
                const csrfTokenForUndo = csrfRes.data?.query?.tokens?.csrftoken;
                
                if (csrfTokenForUndo) {
                    const undoRes = await performUndo(csrfTokenForUndo);
                    
                    if (undoRes.data?.error) {
                         // If Undo also fails (e.g. page creation), fall through to alert
                         console.warn("Undo fallback failed:", undoRes.data.error);
                    } else {
                        // Success!
                        console.log(`Undid edit ${currentEdit.revid} (fallback from rollback)`);
                        setStats(s => ({ ...s, reverted: s.reverted + 1 }));
                        setQueue(q => q.filter(e => e.rcid !== currentEdit.rcid));
                        setCurrentEdit(null);
                        return;
                    }
                }
            } catch (undoErr) {
                console.warn("Undo fallback exception", undoErr);
            }

            alert("Cannot rollback: This user is the only contributor (likely a new page). Use the 'Delete' button if you have permission.");
            return; 
          }
           // Handle "undofailure" (conflict)
           if (res.data.error.code === 'undofailure') {
               alert("Undo failed: Conflict detected. Please resolve manually.");
               return;
           }

          throw new Error(res.data.error.info || "Rollback/Undo error");
        }

        console.log(`Reverted edit ${currentEdit.revid} by ${currentEdit.user}`);
        setStats(s => ({ ...s, reverted: s.reverted + 1 }));
      } catch (err) {
        console.error("Revert failed", err);
        alert(`Revert failed: ${err.message}`);
        return; // Keep in queue on error
      }
    } else if (action === "delete") {
        if (!confirm(`Are you sure you want to DELETE "${currentEdit.title}"? This action cannot be undone easily.`)) return;

        let activeToken = csrfToken;
        
        // Delete requires a CSRF token, NOT a rollback token.
        // If our current token is a rollback token (ends in +\), or we don't have one, fetch a fresh CSRF token.
        // Or if we just want to be safe, always fetch a fresh CSRF token for delete.
        try {
            console.log("Fetching CSRF token for delete...");
            const csrfRes = await axios.get("/api/justapedia", {
                params: { action: "query", meta: "tokens", type: "csrf", format: "json", _: Date.now() },
                headers: { "Cache-Control": "no-cache" },
                withCredentials: true
            });
            activeToken = csrfRes.data?.query?.tokens?.csrftoken;
            
            if (!activeToken) throw new Error("Could not fetch CSRF token");

            const params = new URLSearchParams();
            params.append("action", "delete");
            params.append("title", currentEdit.title);
            params.append("reason", `Vandalism by [[User:${currentEdit.user}|${currentEdit.user}]]`);
            params.append("token", activeToken);
            params.append("format", "json");

            const res = await axios.post("/api/justapedia", params, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                withCredentials: true
            });

            if (res.data?.error) {
                throw new Error(res.data.error.info || "Delete error");
            }
             console.log(`Deleted page ${currentEdit.title}`);
             setStats(s => ({ ...s, reverted: s.reverted + 1 })); // Count as handled
        } catch(err) {
            console.error("Delete failed", err);
            alert(`Delete failed: ${err.message}`);
            return;
        }

    } else {
      setStats(s => ({ ...s, ignored: s.ignored + 1 }));
    }

    // Remove from queue
    setQueue(q => q.filter(e => e.rcid !== currentEdit.rcid));
    setCurrentEdit(null); // Will trigger auto-select next
  };

  if (!isActive) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-red-500/30">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-red-500" />
                AntiVandal <span className="text-zinc-600 text-lg font-normal">Patrol Interface</span>
              </h1>
              <p className="text-zinc-500 mt-1">Real-time vandalism detection and reversion tool.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-white">Justapedia API</div>
                <div className="text-xs text-zinc-500">Connected to Justapedia</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                <User className="w-5 h-5 text-zinc-400" />
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <Play className="w-10 h-10 text-red-500 ml-1" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Start Patrol Session</h2>
              <p className="text-zinc-400 mb-8 max-w-md">
                Begin monitoring Recent Changes feed for potentially vandalistic edits. 
                The system uses heuristic scoring to flag suspicious content.
              </p>
              <button 
                onClick={() => setIsActive(true)}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Initialize Patrol
              </button>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-zinc-500" />
                Session Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400">Total Scanned</span>
                  <span className="text-xl font-mono text-white">{stats.scanned}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                   <span className="text-zinc-400">Reverted</span>
                   <span className="text-xl font-mono text-green-400">{stats.reverted}</span>
                </div>
                 <div className="flex justify-between items-center p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                   <span className="text-zinc-400">False Positives</span>
                   <span className="text-xl font-mono text-yellow-400">{stats.ignored}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      
      {/* Sidebar: Queue */}
      <div className="w-80 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              AntiVandal
            </h2>
            <div className="text-xs text-zinc-500 ml-7">Justapedia API</div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsActive(!isActive)}
              className={`p-2 rounded-lg transition-colors ${isActive ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
              title={isActive ? "Stop Feed" : "Start Feed"}
            >
              {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button onClick={fetchRecentChanges} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
              <RefreshCw className={`w-4 h-4 ${isActive ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {queue.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Queue is empty</p>
              {!isActive && <p className="text-xs mt-2">Press Play to start</p>}
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {queue.map(edit => (
                <div 
                  key={edit.rcid}
                  onClick={() => selectEdit(edit)}
                  className={`p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${currentEdit?.rcid === edit.rcid ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500" : "border-l-4 border-transparent"}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm truncate w-2/3">{edit.title}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${edit.score > 30 ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-600"}`}>
                      {edit.score}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                    <User className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{edit.user}</span>
                    <Clock className="w-3 h-3 ml-1" />
                    <span>{new Date(edit.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-xs text-zinc-400 truncate">
                    {edit.comment || <em>No summary</em>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 flex justify-between">
          <span>Scanned: {stats.scanned}</span>
          <span>Pending: {queue.length}</span>
        </div>
      </div>

      {/* Main Area: Diff & Actions */}
      <div className="flex-1 flex flex-col h-full">
        {currentEdit ? (
          <>
            {/* Header Info */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-start shadow-sm z-10">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  {currentEdit.title}
                  <a 
                    href={`https://justapedia.org/wiki/${encodeURIComponent(currentEdit.title)}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-zinc-400 hover:text-blue-500"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </h1>
                <div className="flex items-center gap-4 text-sm text-zinc-500 mt-1">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" /> {currentEdit.user}
                  </span>
                  <span className={`font-mono ${(currentEdit.newlen - currentEdit.oldlen) < 0 ? "text-red-600" : "text-green-600"}`}>
                    {(currentEdit.newlen - currentEdit.oldlen) > 0 ? "+" : ""}{currentEdit.newlen - currentEdit.oldlen} bytes
                  </span>
                  {currentEdit.issues.length > 0 && (
                    <div className="flex gap-2">
                      {currentEdit.issues.map((issue, i) => (
                        <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                          {issue}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm italic text-zinc-600 mt-2 bg-zinc-50 dark:bg-zinc-800 p-2 rounded border border-zinc-200 dark:border-zinc-700">
                  &quot;{currentEdit.comment}&quot;
                </p>
              </div>
            </div>

            {/* Diff Viewer */}
            <div className="flex-1 overflow-auto p-4 bg-zinc-50 dark:bg-zinc-950">
              {loadingDiff ? (
                <div className="flex items-center justify-center h-full text-zinc-400">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  <style>{`
                    .diff { width: 100%; border-collapse: collapse; font-family: monospace; font-size: 0.9rem; }
                    .diff td { padding: 4px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
                    .diff-addedline { background-color: #dcfce7; color: #14532d; }
                    .diff-deletedline { background-color: #fee2e2; color: #7f1d1d; }
                    .diff-context { background-color: #f9fafb; color: #6b7280; }
                    .diff-marker { user-select: none; font-weight: bold; width: 20px; text-align: center; }
                    .dark .diff td { border-color: #27272a; }
                    .dark .diff-addedline { background-color: #052e16; color: #86efac; }
                    .dark .diff-deletedline { background-color: #450a0a; color: #fca5a5; }
                    .dark .diff-context { background-color: #18181b; color: #a1a1aa; }
                  `}</style>
                  <table className="diff" dangerouslySetInnerHTML={{ __html: diffHtml }} />
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center gap-4">
              <button 
                onClick={() => handleAction("revert")}
                className="flex flex-col items-center justify-center w-40 h-24 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <RotateCcw className="w-8 h-8 mb-2" />
                <span className="font-bold">Rollback</span>
                <span className="text-xs opacity-75">Revert & Warn</span>
              </button>

              <button 
                onClick={() => handleAction("skip")}
                className="flex flex-col items-center justify-center w-40 h-24 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl transition-transform hover:scale-105 active:scale-95"
              >
                <Check className="w-8 h-8 mb-2" />
                <span className="font-bold">Keep</span>
                <span className="text-xs opacity-75">Edit is constructive</span>
              </button>

              <button 
                onClick={() => handleAction("ignore")}
                className="flex flex-col items-center justify-center w-40 h-24 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 rounded-xl transition-transform hover:scale-105 active:scale-95 border border-zinc-200 dark:border-zinc-800"
              >
                <X className="w-8 h-8 mb-2" />
                <span className="font-bold">Skip</span>
                <span className="text-xs opacity-75">Not sure</span>
              </button>

              <div className="w-px h-16 bg-zinc-200 dark:bg-zinc-800 mx-2"></div>

              <button 
                onClick={() => handleAction("delete")}
                title="Delete Page (Admin Only)"
                className="flex flex-col items-center justify-center w-20 h-24 bg-zinc-100 dark:bg-zinc-900 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600/50 hover:text-red-600 rounded-xl transition-all border border-zinc-200 dark:border-zinc-800 border-dashed hover:border-red-500"
              >
                <Trash2 className="w-6 h-6 mb-1" />
                <span className="text-xs font-bold">Delete</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
            <ShieldAlert className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-bold mb-2">AntiVandal is ready</h3>
            <p className="max-w-md text-center mb-8">
              Click the <Play className="w-4 h-4 inline mx-1" /> button to start monitoring recent changes. 
              Suspicious edits will appear in the queue.
            </p>
            {!isActive && (
              <button 
                onClick={() => setIsActive(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Play className="w-5 h-5" /> Start Patrol
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}