"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Play, RefreshCw, FileText, Save, ArrowRight, Lock
} from "lucide-react";
import { fetchArticle, saveEdit, rewriteArticleContent, checkBotStatus } from "@/utils/botLogic";

export default function RewriteBotPage() {
  const { user } = useAuth();

  const [targetPage, setTargetPage] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [rewrittenContent, setRewrittenContent] = useState("");
  const [changes, setChanges] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [botAuth, setBotAuth] = useState({ loggedIn: false, username: "" });
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (user?.name !== "Sourav") return;
    checkBotStatus().then(setBotAuth);
  }, [user?.name]);
  
  // Restricted Access Check
  // Only "sourav" is allowed to access this tool
  if (user?.name !== "Sourav") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Restricted Access</h1>
          <p className="text-zinc-400 mb-6">
            The Rewrite Bot is currently disabled for general users. 
            Only authorized personnel (sourav) can access this tool.
          </p>
          <div className="text-xs text-zinc-600 font-mono">
            Current User: {user?.name || "Guest"}
          </div>
        </div>
      </div>
    );
  }

  const handleFetch = async () => {
    if (!targetPage) return;
    setStatusMsg("Fetching article...");
    const article = await fetchArticle(targetPage);
    if (article) {
      setOriginalContent(article.content);
      setRewrittenContent("");
      setChanges([]);
      setStatusMsg("Article fetched.");
    } else {
      setStatusMsg("Article not found.");
    }
  };

  const handleRewrite = async () => {
    if (!originalContent) return;
    setIsProcessing(true);
    setStatusMsg("Rewriting...");
    
    try {
      const result = await rewriteArticleContent(originalContent);
      setRewrittenContent(result.newContent);
      setChanges(result.changes);
      setStatusMsg(`Rewrite complete. ${result.changes.length} changes proposed.`);
    } catch (e) {
      console.error(e);
      setStatusMsg("Error during rewrite.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!rewrittenContent || !targetPage) return;
    setStatusMsg("Saving...");
    
    // Summary
    const summary = `Bot: Rewrote article (Wikification, copyedit) - ${changes.length} changes`;
    
    const res = await saveEdit(targetPage, rewrittenContent, summary, true); // true = bot flag
    if (res.success) {
      setStatusMsg("Saved successfully!");
      setOriginalContent(rewrittenContent); // Update state
      setChanges([]);
    } else {
      setStatusMsg(`Save failed: ${res.error}`);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Rewrite Bot</h1>
        <p className="text-zinc-400">Automated article wikification and copyediting.</p>
        <div className="mt-2 text-sm text-zinc-500">
           Bot Status: {botAuth.loggedIn ? <span className="text-emerald-400">Logged in as {botAuth.username}</span> : <span className="text-red-400">Not logged in</span>}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        {/* Left Panel: Input & Original */}
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex gap-2">
            <input 
              type="text" 
              value={targetPage}
              onChange={(e) => setTargetPage(e.target.value)}
              placeholder="Article Title"
              className="flex-1 bg-zinc-800 border-none rounded px-3 py-2 text-white focus:ring-1 focus:ring-blue-500"
            />
            <button 
              onClick={handleFetch}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <FileText size={16} /> Fetch
            </button>
          </div>

          <div className="flex-1 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 text-sm font-medium">
              Original Content
            </div>
            <textarea 
              value={originalContent}
              onChange={(e) => setOriginalContent(e.target.value)}
              className="flex-1 bg-zinc-950 p-4 text-sm font-mono text-zinc-300 resize-none focus:outline-none"
              placeholder="Content will appear here..."
            />
          </div>
        </div>

        {/* Right Panel: Controls & Result */}
        <div className="flex flex-col gap-4">
           <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
             <div className="text-zinc-400 text-sm">{statusMsg}</div>
             <div className="flex gap-2">
               <button 
                 onClick={handleRewrite}
                 disabled={isProcessing || !originalContent}
                 className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded flex items-center gap-2"
               >
                 {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />} 
                 Rewrite
               </button>
               {rewrittenContent && (
                 <button 
                   onClick={handleSave}
                   className="bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-2 rounded flex items-center gap-2 font-medium"
                 >
                   <Save size={16} /> Save Changes
                 </button>
               )}
             </div>
           </div>

           <div className="flex-1 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 text-sm font-medium flex justify-between">
              <span>Rewritten Content</span>
              <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">
                {changes.length} Changes
              </span>
            </div>
            <textarea 
              value={rewrittenContent}
              onChange={(e) => setRewrittenContent(e.target.value)}
              className="flex-1 bg-zinc-950 p-4 text-sm font-mono text-zinc-300 resize-none focus:outline-none"
              placeholder="Rewritten content will appear here..."
            />
          </div>
          
          {/* Changes Log */}
          <div className="h-48 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col overflow-hidden">
             <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 text-sm font-medium">
               Proposed Changes
             </div>
             <div className="flex-1 overflow-y-auto p-4">
               <ul className="space-y-1 text-xs font-mono text-zinc-400">
                 {changes.map((change, i) => (
                   <li key={i} className="flex gap-2">
                     <span className="text-blue-500">[{i+1}]</span> {change}
                   </li>
                 ))}
                 {changes.length === 0 && <li className="text-zinc-600 italic">No changes proposed yet.</li>}
               </ul>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
