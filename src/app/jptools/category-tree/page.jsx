"use client";

import { useState } from "react";
import axios from "axios";
import { FolderTree, Folder, FileText, ChevronRight, ChevronDown, AlertCircle } from "lucide-react";

export default function CategoryTree() {
  const [rootCategory, setRootCategory] = useState("Contents"); // Default root
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!rootCategory.trim()) return;
    setLoading(true);
    setError("");
    setTreeData(null);
    
    // Clean input (remove Category: prefix if present)
    const cleanName = rootCategory.replace(/^Category:/i, "");
    
    try {
      // Just set the root node, the tree component handles fetching children
      setTreeData({
        title: cleanName,
        ns: 14,
        id: "root",
        isRoot: true
      });
    } catch (err) {
      setError("Failed to initialize tree.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
        <FolderTree className="w-8 h-8 text-yellow-500" /> Category Tree
      </h1>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Root Category Name
          </label>
          <input
            type="text"
            value={rootCategory}
            onChange={(e) => setRootCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. History"
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-yellow-500 outline-none"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600"
          >
            Load Tree
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {treeData && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 min-h-[400px]">
          <TreeNode node={treeData} />
        </div>
      )}
    </div>
  );
}

function TreeNode({ node }) {
  const [expanded, setExpanded] = useState(node.isRoot);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const toggleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);

    if (!loaded && !loading) {
      setLoading(true);
      try {
        const res = await axios.get("/api/justapedia", {
          params: {
            action: "query",
            list: "categorymembers",
            cmtitle: `Category:${node.title}`,
            cmlimit: 50, // Limit for performance
            cmtype: "page|subcat",
            format: "json",
            // origin: "*"
          }
        });
        
        const members = res.data?.query?.categorymembers || [];
        setChildren(members);
        setLoaded(true);
      } catch (err) {
        setError("Failed to load contents.");
      } finally {
        setLoading(false);
      }
    }
  };

  const subcats = children.filter(c => c.ns === 14);
  const pages = children.filter(c => c.ns !== 14);

  return (
    <div className="ml-4 border-l border-zinc-200 dark:border-zinc-700 pl-4 py-1">
      <div className="flex items-center gap-2">
        {node.ns === 14 ? (
          <button 
            onClick={toggleExpand}
            className="p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-5" /> // Spacer
        )}
        
        {node.ns === 14 ? (
          <Folder className="w-4 h-4 text-yellow-500" />
        ) : (
          <FileText className="w-4 h-4 text-zinc-400" />
        )}
        
        <a 
          href={`https://justapedia.org/wiki/${encodeURIComponent(node.title)}`}
          target="_blank"
          rel="noreferrer"
          className={`hover:underline ${node.ns === 14 ? "font-semibold text-zinc-800 dark:text-zinc-200" : "text-zinc-600 dark:text-zinc-400"}`}
        >
          {node.title.replace(/^Category:/, "")}
        </a>
        
        {loading && <span className="text-xs text-zinc-400 animate-pulse">loading...</span>}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>

      {expanded && (
        <div className="mt-1">
          {subcats.map(cat => (
            <TreeNode key={cat.pageid} node={cat} />
          ))}
          {pages.map(page => (
             <div key={page.pageid} className="ml-4 border-l border-zinc-200 dark:border-zinc-700 pl-4 py-1 flex items-center gap-2">
               <span className="w-5" />
               <FileText className="w-4 h-4 text-zinc-400" />
               <a 
                  href={`https://justapedia.org/wiki/${encodeURIComponent(page.title)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-600 dark:text-zinc-400 hover:underline"
                >
                  {page.title}
               </a>
             </div>
          ))}
          {loaded && children.length === 0 && (
            <div className="ml-8 text-zinc-400 text-sm italic py-1">Empty category</div>
          )}
        </div>
      )}
    </div>
  );
}
