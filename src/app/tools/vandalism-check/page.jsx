"use client";

import { useState } from "react";
import axios from "axios";
import { AlertTriangle, User, Search, ShieldAlert, CheckCircle, ExternalLink, AlertOctagon, Gavel } from "lucide-react";

export default function VandalismCheck() {
  const [username, setUsername] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    if (!username.trim()) return;
    
    setLoading(true);
    setError("");
    setReport(null);
    
    try {
      // 1. Fetch User Info
      const userRes = await axios.get("/api/justapedia", {
        params: {
          action: "query",
          list: "users",
          ususers: username,
          usprop: "groups|registration|editcount",
          format: "json",
          // origin: "*"
        }
      });

      const user = userRes.data?.query?.users?.[0];
      if (!user || user.missing !== undefined) {
        throw new Error(`User "${username}" not found.`);
      }

      // 2. Fetch Detailed Logs & Edits in Parallel
      const [blockLogRes, abuseLogRes, contribsRes] = await Promise.all([
        // A. Block Log (Times user was blocked)
        axios.get("/api/justapedia", {
          params: {
            action: "query",
            list: "logevents",
            letype: "block",
            letitle: `User:${user.name}`,
            lelimit: 50,
            format: "json",
            // origin: "*"
          }
        }),
        // B. Abuse Filter Log (Times user triggered filters)
        axios.get("/api/justapedia", {
          params: {
            action: "query",
            list: "logevents",
            letype: "abusefilter", // Check 'abusefilter' type
            leuser: user.name,
            lelimit: 50,
            format: "json",
            // origin: "*"
          }
        }),
        // C. Last 500 Edits (for deeper stats)
        axios.get("/api/justapedia", {
          params: {
            action: "query",
            list: "usercontribs",
            ucuser: username,
            uclimit: 500, // Increased limit for better stats
            ucprop: "ids|title|timestamp|comment|size|sizediff|flags|tags",
            format: "json",
            // origin: "*"
          }
        })
      ]);

      const blockLogs = blockLogRes.data?.query?.logevents || [];
      const abuseLogs = abuseLogRes.data?.query?.logevents || [];
      const edits = contribsRes.data?.query?.usercontribs || [];
      
      // 3. Analyze Edits for Suspicious Patterns
      let suspiciousCount = 0;

      // Suspicious Analysis Loop (Top 50)
      const flaggedEdits = edits.slice(0, 50).map(edit => {
        const issues = [];
        const diff = edit.sizediff || 0;
        
        // Pattern 1: Large Deletions
        if (diff < -500 && !edit.comment.toLowerCase().includes("archiv")) {
          issues.push("Large content removal");
        }
        
        // Pattern 2: Reverted Tag
        if (edit.tags?.includes("mw-reverted") || edit.tags?.includes("reverted")) {
          issues.push("Tagged as reverted");
        }
        
        // Pattern 3: Profanity / Vandalism Keywords
        const badWords = ["vandal", "poop", "stupid", "haha", "test", "asdf"];
        if (badWords.some(w => (edit.comment || "").toLowerCase().includes(w))) {
           issues.push("Suspicious summary");
        }
        
        // Pattern 4: Repeated Characters
        if (/(.)\1{4,}/.test(edit.comment || "")) {
           issues.push("Repetitive summary");
        }

        return issues.length > 0 ? { ...edit, issues } : null;
      }).filter(Boolean);

      // Check current block status
      // We look at the latest block log event. If it's a "block" or "reblock" and no "unblock" after.
      // Actually, fetching "users" with "blocks" prop is safer for *current* status.
      // Let's trust the "users" prop if we added it, but I removed it from the initial fetch to simplify.
      // Let's re-add it or infer from log? API `list=users&usprop=blockinfo` is best.
      // I'll stick to the log for "History" and do a quick check for current status.
      // Wait, I removed `bkusers` from step 1. Let's add it back or rely on log.
      // Actually, let's just use the log for "Total Blocks" and maybe trust the first API call if I fix it.
      // I'll add `bkusers` back to the first call.
      
      const currentBlockRes = await axios.get("/api/justapedia", {
          params: {
            action: "query",
            list: "blocks",
            bkusers: username,
            format: "json",
            // origin: "*"
          }
      });
      const currentBlock = currentBlockRes.data?.query?.blocks?.[0];

      // Calculate Score
      // Base score on: Suspicious edits %, Block history, Abuse Filter hits
      let riskScore = 0;
      
      const suspiciousRate = (flaggedEdits.length / Math.min(50, edits.length)) * 100;
      riskScore += suspiciousRate; 
      
      if (blockLogs.length > 0) riskScore += 30; // Previously blocked
      if (currentBlock) riskScore = 100; // Currently blocked
      if (abuseLogs.length > 0) riskScore += (abuseLogs.length * 10); // 10 pts per abuse hit

      setReport({
        user,
        isBlocked: !!currentBlock,
        blockInfo: currentBlock,
        totalScanned: edits.length,
        suspiciousCount: flaggedEdits.length,
        suspiciousEdits: flaggedEdits,
        score: Math.min(100, Math.round(riskScore)),
        stats: {
          totalBlocks: blockLogs.length,
          abuseHits: abuseLogs.length
        }
      });

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to analyze user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
        <AlertTriangle className="w-8 h-8 text-orange-500" /> Vandalism Checker
      </h1>
      
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex gap-4">
        <div className="flex-1 relative">
          <User className="absolute left-3 top-3 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            placeholder="Enter username to scan..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>
        <button
          onClick={handleCheck}
          disabled={loading}
          className="px-6 py-2.5 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Scanning..." : "Scan User"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 flex items-center gap-2">
          <AlertOctagon className="w-5 h-5" />
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 1. Account Status */}
            <div className={`p-6 rounded-xl border ${report.isBlocked ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"}`}>
              <h3 className="font-bold mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                {report.isBlocked ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                Status
              </h3>
              <p className="text-2xl font-bold">{report.isBlocked ? "BLOCKED" : "ACTIVE"}</p>
              {report.isBlocked && (
                <p className="text-sm mt-1 opacity-80 truncate">
                  {report.blockInfo.reason || "No reason given"}
                </p>
              )}
            </div>

            {/* 2. Block History */}
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <h3 className="font-bold text-zinc-500 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Gavel className="w-4 h-4" /> Block History
              </h3>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                {report.stats.totalBlocks} <span className="text-sm text-zinc-400 font-normal">times</span>
              </p>
            </div>

            {/* 3. Abuse Filter */}
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <h3 className="font-bold text-zinc-500 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                <AlertOctagon className="w-4 h-4 text-orange-500" /> Abuse Hits
              </h3>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                {report.stats.abuseHits} <span className="text-sm text-zinc-400 font-normal">logs</span>
              </p>
            </div>

             {/* 4. Risk Score */}
             <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <h3 className="font-bold text-zinc-500 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                Risk Score
              </h3>
              <div className="flex items-center gap-3">
                <div className={`text-3xl font-bold ${
                  report.score > 50 ? "text-red-600" : report.score > 20 ? "text-yellow-600" : "text-green-600"
                }`}>{report.score}%</div>
                <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className={`h-full ${
                    report.score > 50 ? "bg-red-500" : report.score > 20 ? "bg-yellow-500" : "bg-green-500"
                  }`} style={{ width: `${report.score}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
