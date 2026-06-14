"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Square,
  RefreshCw,
  Terminal,
  AlertTriangle,
  CheckCircle,
  FileText,
  Activity,
  BookOpen,
} from "lucide-react";
import {
  fetchRandomArticle,
  fetchPriorityArticle,
  fetchCategoryArticle,
  fetchArticle,
  processArticleContent,
  saveEdit,
  postTalkPageReport,
} from "@/utils/botLogic";

function ChangeItem({ text }) {
  const [expanded, setExpanded] = useState(false);
  const threshold = 120; // Show first 120 chars

  if (!text || text.length <= threshold) {
    return <li className="break-words">{text}</li>;
  }

  return (
    <li className="break-words">
      {expanded ? text : text.slice(0, threshold) + "..."}
      <button
        onClick={() => setExpanded(!expanded)}
        className="ml-2 text-blue-400 hover:text-blue-300 text-xs font-bold inline-flex items-center gap-1 focus:outline-none hover:underline"
      >
        {expanded ? "See less" : "See more"}
      </button>
    </li>
  );
}

export default function CitationBotPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Bot Options
  const [autoSave, setAutoSave] = useState(false);
  const [processAll, setProcessAll] = useState(false);
  const [performNullEdits, setPerformNullEdits] = useState(false);
  const [scanMode, setScanMode] = useState("priority"); // "priority", "category", "random", "page"
  const [targetCategory, setTargetCategory] = useState("");
  const [targetPage, setTargetPage] = useState("");

  // Pending Review
  const [pendingEdit, setPendingEdit] = useState(null); // { title, content, summary, changes }

  const [logs, setLogs] = useState([
    {
      id: 1,
      action: "System Check",
      user: "System",
      time: "10:00 AM",
      status: "success",
    },
  ]);

  // Ref to control loop
  const stopSignal = useRef(false);

  // Refs for live access in loop
  const autoSaveRef = useRef(autoSave);
  const processAllRef = useRef(processAll);
  const performNullEditsRef = useRef(performNullEdits);
  const scanModeRef = useRef(scanMode);
  const targetCategoryRef = useRef(targetCategory);
  const targetPageRef = useRef(targetPage);

  // Sync refs with state
  useEffect(() => {
    autoSaveRef.current = autoSave;
    processAllRef.current = processAll;
    performNullEditsRef.current = performNullEdits;
    scanModeRef.current = scanMode;
    targetCategoryRef.current = targetCategory;
    targetPageRef.current = targetPage;
  }, [
    autoSave,
    processAll,
    performNullEdits,
    scanMode,
    targetCategory,
    targetPage,
  ]);

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

  const addLog = (action, username, status, details = "") => {
    const newLog = {
      id: Date.now() + Math.random(),
      action,
      user: username, // This is technically "Controller" in UI now, or "System"
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status,
      details,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  // --- Bot Logic Loop ---

  const runBotCycle = async () => {
    if (stopSignal.current) {
      setIsRunning(false);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    let statusMsg = "Fetching random article...";
    if (scanModeRef.current === "priority")
      statusMsg = "Scanning for priority issues...";
    if (scanModeRef.current === "category")
      statusMsg = `Scanning category: ${targetCategoryRef.current}...`;
    if (scanModeRef.current === "page")
      statusMsg = `Fetching page: ${targetPageRef.current}...`;

    addLog(statusMsg, "Sourav bot", "info");

    try {
      // 1. Fetch
      let article;
      if (scanModeRef.current === "priority") {
        article = await fetchPriorityArticle();
        if (!article) {
          addLog(
            "No priority issues found, checking random...",
            "Sourav bot",
            "info",
          );
          article = await fetchRandomArticle();
        }
      } else if (scanModeRef.current === "category") {
        if (!targetCategoryRef.current.trim()) {
          addLog("Target category is empty!", "System", "error");
          setIsRunning(false);
          return;
        }
        article = await fetchCategoryArticle(targetCategoryRef.current);
        if (!article) {
          addLog(
            `No articles found in category: ${targetCategoryRef.current}`,
            "Sourav bot",
            "warning",
          );
          setIsRunning(false);
          return;
        }
      } else if (scanModeRef.current === "page") {
        if (!targetPageRef.current.trim()) {
          addLog("Target page is empty!", "System", "error");
          setIsRunning(false);
          return;
        }
        article = await fetchArticle(targetPageRef.current);
        if (!article) {
          addLog(
            `Page not found: ${targetPageRef.current}`,
            "Sourav bot",
            "error",
          );
          setIsRunning(false);
          return;
        }
      } else {
        article = await fetchRandomArticle();
      }

      if (!article) {
        addLog("Failed to fetch article", "Sourav bot", "error");
        if (processAllRef.current) setTimeout(runBotCycle, 5000);
        else setIsRunning(false);
        return;
      }
      addLog(`Analyzing: ${article.title}`, "Sourav bot", "info");

      // 2. Process
      const result = await processArticleContent(article.content);

      // Handle Unfixable Issues
      if (result.unfixableIssues && result.unfixableIssues.length > 0) {
        addLog(
          `Found ${result.unfixableIssues.length} unfixable issues`,
          "Sourav bot",
          "warning",
        );
        if (autoSaveRef.current) {
          await postTalkPageReport(article.title, result.unfixableIssues);
          addLog(`Posted report to Talk page`, "Sourav bot", "success");
        } else {
          addLog(
            `Manual intervention required: ${result.unfixableIssues.join(", ")}`,
            "Sourav bot",
            "warning",
          );
        }
      }

      if (!result.hasChanges) {
        // Check for unfixable issues in Manual Mode
        if (
          result.unfixableIssues &&
          result.unfixableIssues.length > 0 &&
          !autoSaveRef.current
        ) {
          setPendingEdit({
            title: article.title,
            original: article.content,
            content: article.content, // No changes
            summary: "citation bot tools edit", // Fixed summary
            changes: [],
            issues: result.issues || [],
            unfixableIssues: result.unfixableIssues,
          });
          setIsProcessing(false);
          // Stop loop to allow user to decide (Wait for user action)
          return;
        }

        if (performNullEditsRef.current) {
          addLog(
            `Performing Null Edit for maintenance on ${article.title}...`,
            "Sourav bot",
            "warning",
          );
          const saveRes = await saveEdit(
            article.title,
            article.content,
            "Bot: Null edit for maintenance category cleanup",
            true,
          );

          if (saveRes.success) {
            addLog(
              `Saved (Null Edit): ${article.title}`,
              "Sourav bot",
              "success",
            );
          } else {
            addLog(`Null Edit failed: ${saveRes.error}`, "Sourav bot", "error");
          }

          if (processAllRef.current && !stopSignal.current) {
            setTimeout(runBotCycle, 2000);
          } else {
            setIsRunning(false);
          }
          return;
        }

        addLog(`No changes needed for ${article.title}`, "Sourav bot", "info");
        if (processAllRef.current && !stopSignal.current) {
          // Continue loop
          setTimeout(runBotCycle, 2000);
        } else {
          setIsRunning(false);
        }
        return;
      }

      // 3. Handle Changes
      const summary = `Bot: ${result.changes.join(", ")} | citation bot tools edit`;

      if (autoSaveRef.current) {
        // Auto-save mode
        addLog(
          `Applying fixes to ${article.title}...`,
          "Sourav bot",
          "warning",
        );
        const saveRes = await saveEdit(
          article.title,
          result.newContent,
          summary,
          true,
        );

        if (saveRes.success) {
          addLog(`Saved: ${article.title}`, "Sourav bot", "success");
        } else {
          addLog(`Save failed: ${saveRes.error}`, "Sourav bot", "error");
        }

        // Loop?
        if (processAllRef.current && !stopSignal.current) {
          setTimeout(runBotCycle, 3000);
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
          issues: result.issues,
          unfixableIssues: result.unfixableIssues,
        });
        setIsProcessing(false);
        // NOTE: We do NOT continue loop here. We wait for user action.
        // Loop will resume after user accepts/rejects if processAll is true.
      }
    } catch (error) {
      addLog(`Error in bot cycle: ${error.message}`, "System", "error");
      setIsRunning(false);
    }
  };

  const handlePostReport = async () => {
    if (!pendingEdit || !pendingEdit.unfixableIssues) return;

    addLog(
      `Posting report to Talk page for ${pendingEdit.title}...`,
      "Operator",
      "warning",
    );
    const res = await postTalkPageReport(
      pendingEdit.title,
      pendingEdit.unfixableIssues,
    );

    if (res.success) {
      addLog(`Report posted successfully`, "Sourav bot", "success");
    } else {
      addLog(`Failed to post report: ${res.error}`, "Sourav bot", "error");
    }
  };

  const handleApproveEdit = async () => {
    if (!pendingEdit) return;

    addLog(`Approving edit for ${pendingEdit.title}...`, "Operator", "success");
    const finalSummary = `Bot: ${pendingEdit.changes.join(", ")} | citation bot tools edit`;
    const saveRes = await saveEdit(
      pendingEdit.title,
      pendingEdit.content,
      finalSummary,
      true,
    );

    if (saveRes.success) {
      addLog(`Saved: ${pendingEdit.title}`, "Sourav bot", "success");
    } else {
      addLog(`Save failed: ${saveRes.error}`, "Sourav bot", "error");
    }

    setPendingEdit(null);

    // Resume loop if processAll
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

    // Resume loop if processAll
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
            <h1 className="text-3xl font-bold text-white">Citation Bot</h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                isRunning
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}
            >
              {isRunning ? "Running" : "Idle"}
            </span>
          </div>
          <div className="text-zinc-400 max-w-2xl text-sm space-y-4">
            <p className="leading-relaxed">
              Citation bot is a piece of software designed to expand and fix
              citations on justapedia, making referencing easier. This guide
              will help you get the best results with Citation bot. There is no
              need to painstakingly enter and copy-paste author names, date,
              source titles, and page numbers anymore. Now you can type or paste
              in only the DOI, PMID, S2CID, or the Google Books URL, and let the
              bot do the rest! It will also try to fix a variety of common
              errors with existing citations, and tidy them up as best it can!
            </p>
          </div>
        </div>

        {/* Control Panel */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
            {/* Checkboxes */}
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-emerald-500/20"
                />
                Auto-Save
              </label>
              <div className="w-px h-4 bg-zinc-700"></div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={processAll}
                  onChange={(e) => setProcessAll(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-blue-500 focus:ring-blue-500/20"
                />
                Continuous Mode
              </label>
              <div className="w-px h-4 bg-zinc-700"></div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={performNullEdits}
                  onChange={(e) => setPerformNullEdits(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-purple-500 focus:ring-purple-500/20"
                />
                Null Edits (Maintenance)
              </label>
            </div>

            {/* Scan Mode Selection */}
            <div className="flex flex-wrap items-center gap-2 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
              <span className="text-xs font-bold text-zinc-500 uppercase px-2">
                Scan Mode:
              </span>

              <button
                onClick={() => setScanMode("priority")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  scanMode === "priority"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                Target Issues
              </button>

              <button
                onClick={() => setScanMode("category")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  scanMode === "category"
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                Category
              </button>

              <button
                onClick={() => setScanMode("page")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  scanMode === "page"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                Page
              </button>

              <button
                onClick={() => setScanMode("random")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  scanMode === "random"
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                Random
              </button>
            </div>

            {/* Category Input */}
            {scanMode === "category" && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <input
                  type="text"
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  placeholder="Enter Category Name (e.g. Physics)"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none placeholder:text-zinc-600"
                />
                <p className="text-[10px] text-zinc-500 mt-1 pl-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  The bot will only scan and fix articles within this category.
                </p>
              </div>
            )}

            {/* Page Input */}
            {scanMode === "page" && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <input
                  type="text"
                  value={targetPage}
                  onChange={(e) => setTargetPage(e.target.value)}
                  placeholder="Enter Exact Page Title"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none placeholder:text-zinc-600"
                />
                <p className="text-[10px] text-zinc-500 mt-1 pl-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  The bot will only scan and fix this specific page.
                </p>
              </div>
            )}
          </div>

          {/* Start/Stop Buttons */}
          <div className="flex justify-end">
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={
                  (scanMode === "category" && !targetCategory.trim()) ||
                  (scanMode === "page" && !targetPage.trim())
                }
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all shadow-lg ${
                  (scanMode === "category" && !targetCategory.trim()) ||
                  (scanMode === "page" && !targetPage.trim())
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20"
                }`}
              >
                <Play className="w-4 h-4" /> Start Bot
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20"
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
              Review Changes: {pendingEdit.title}
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
            {/* Unfixable Issues (Reportable) */}
            {pendingEdit.unfixableIssues &&
              pendingEdit.unfixableIssues.length > 0 && (
                <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-orange-400 uppercase flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" /> Requires Manual
                      Intervention
                    </h4>
                    <button
                      onClick={handlePostReport}
                      className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded shadow-lg shadow-orange-900/20 transition-all flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" /> Post Report
                    </button>
                  </div>
                  <ul className="list-disc list-inside text-sm text-orange-300/80 space-y-1">
                    {pendingEdit.unfixableIssues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Categorized Issues */}
            {pendingEdit.issues && pendingEdit.issues.length > 0 && (
              <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                <h4 className="text-xs font-bold text-red-400 uppercase mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" /> Identified Issues
                </h4>
                <div className="flex flex-wrap gap-2">
                  {pendingEdit.issues.map((issue, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded border border-red-500/30"
                    >
                      {issue}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
              <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">
                Proposed Changes
              </h4>
              <ul className="list-disc list-inside text-sm text-zinc-300">
                {pendingEdit.changes.map((c, i) => (
                  <ChangeItem key={i} text={c} />
                ))}
              </ul>
            </div>

            {/* Simple Diff Preview (Original vs New) */}
            <div className="grid grid-cols-2 gap-4 h-[300px]">
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 overflow-auto">
                <div className="text-xs font-bold text-red-400 mb-2 sticky top-0 bg-zinc-950 pb-2 border-b border-zinc-900">
                  Original
                </div>
                <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap">
                  {pendingEdit.original}
                </pre>
              </div>
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 overflow-auto">
                <div className="text-xs font-bold text-emerald-400 mb-2 sticky top-0 bg-zinc-950 pb-2 border-b border-zinc-900">
                  New Content
                </div>
                <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">
                  {pendingEdit.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Full Width: Mission & Scope (New Section) */}
        <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            Request to Identify Pages Requiring the Citation Bot
          </h3>

          <p className="text-zinc-400 mb-6 leading-relaxed">
            Please search the entire site and identify all pages where
            citation-related problems exist and cannot be efficiently fixed
            manually.
          </p>

          <div className="grid md:grid-cols-2 gap-8 text-sm">
            {/* Issues List */}
            <div className="space-y-4">
              <h4 className="font-bold text-red-400 uppercase text-xs tracking-wider border-b border-red-500/20 pb-2">
                Target Issues
              </h4>
              <p className="text-zinc-500 italic mb-2">
                These are the types of issues that specifically require the use
                of the Citation Bot:
              </p>
              <ul className="space-y-2 text-zinc-300">
                {[
                  "Pages with missing citations",
                  "Pages containing incomplete or broken references",
                  "Incorrect or malformed citation templates",
                  "Missing archive-url or archive-date",
                  "Invalid ISBN / DOI / PMID data",
                  "Web citations without proper archival formatting",
                  "Red citation errors flagged by the MediaWiki citation checker",
                  "Large articles where manual citation fixing is impractical",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Column: Objective & Notes */}
            <div className="space-y-8">
              {/* Objective */}
              <div className="space-y-2">
                <h4 className="font-bold text-blue-400 uppercase text-xs tracking-wider border-b border-blue-500/20 pb-2">
                  Objective
                </h4>
                <ul className="space-y-2 text-zinc-300">
                  {[
                    "Systematically locate affected pages",
                    "Categorize the citation problems",
                    "Apply the Citation Bot only where automation is necessary",
                    "Improve overall citation accuracy, consistency, and reliability",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Important Notes */}
              <div className="space-y-2">
                <h4 className="font-bold text-amber-400 uppercase text-xs tracking-wider border-b border-amber-500/20 pb-2">
                  Important Notes
                </h4>
                <ul className="space-y-2 text-zinc-300">
                  {[
                    "The Citation Bot should be used only for citation-related fixes",
                    "No content rewriting or stylistic changes",
                    "All actions must follow Justapedia citation standards",
                    "Bot edits will be logged and fully traceable",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Expected Outcome */}
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <h4 className="font-bold text-emerald-400 uppercase text-xs tracking-wider mb-3">
              Expected Outcome
            </h4>
            <p className="text-zinc-400 mb-3 text-sm">
              By identifying and addressing these pages:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                "Citation quality across the site will significantly improve",
                "Manual editor workload will be reduced",
                "Articles will meet Justapedia’s reliability and sourcing standards",
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg text-emerald-300 text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-zinc-400" />
                System Logs
              </h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col p-2 rounded hover:bg-zinc-800/50 text-sm font-mono transition-colors border-b border-zinc-800/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 text-xs min-w-[60px]">
                      {log.time}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        log.status === "success"
                          ? "bg-emerald-500"
                          : log.status === "warning"
                            ? "bg-amber-500"
                            : log.status === "error"
                              ? "bg-red-500"
                              : "bg-blue-500"
                      }`}
                    />
                    <span className="text-zinc-300 flex-1 truncate">
                      <span className="font-bold text-white mr-2">
                        [{log.user}]
                      </span>
                      {log.action}
                    </span>
                  </div>
                  {log.details && (
                    <div className="ml-[88px] text-xs text-zinc-500 mt-1">
                      ↳ {log.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Configuration & Links */}
        <div className="space-y-6">
          {/* Configuration Summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-400" />
              Bot Rules
            </h3>
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Fix formatting errors</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Validate DOIs, PMIDs, PMCs</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Enforce ISBN & S2CID checks</span>
              </div>
              <div className="p-3 bg-zinc-950 rounded-lg text-xs font-mono mt-4 border border-zinc-800">
                partial_citations: strict
                <br />
                identifiers: [doi, pmid, pmc, isbn, s2cid]
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 pt-8 mt-12 text-center text-zinc-500 text-sm space-y-2">
        <p>
          Developed by <span className="text-zinc-300 font-medium">Sourav</span>
        </p>
        <p>
          Contact:{" "}
          <a
            href="mailto:skhsouravhalder@gmail.com"
            className="text-blue-400 hover:underline"
          >
            skhsouravhalder@gmail.com
          </a>
        </p>
        <p>Copyright © 2026 by the Tools contributors.</p>
        <p className="text-xs text-zinc-600 max-w-3xl mx-auto mt-4">
          JPTools (also known as Justapedia Tools) is free and open-source
          software licensed under the GNU General Public License, version 3 or
          later (GPL-3.0+).
        </p>
        <p className="text-xs text-zinc-600 max-w-3xl mx-auto mt-2">
          Hosting generously provided by{" "}
          <a
            href="https://www.interserver.net/"
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:underline"
          >
            InterServer
          </a>
          .
        </p>
      </div>
    </div>
  );
}
