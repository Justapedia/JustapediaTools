"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FilePlus, User, Clock, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";

export default function NewPagesFeed() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(50);

  const fetchNewPages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        action: "query",
        list: "recentchanges",
        rctype: "new",
        rclimit: limit,
        rcnamespace: 0, // Main namespace only by default for "New Articles"
        rcprop: "title|ids|sizes|flags|user|timestamp|comment|tags",
      format: "json",
      // origin: "*"
      };

      const res = await axios.get("/api/justapedia", { params });
      
      if (res.data.error) {
        throw new Error(res.data.error.info);
      }

      setPages(res.data.query?.recentchanges || []);
    } catch (err) {
      setError(err.message || "Failed to fetch new pages.");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchNewPages();
  }, [fetchNewPages]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
          <FilePlus className="w-8 h-8 text-indigo-500" /> New Pages Feed
        </h1>
        <button 
          onClick={fetchNewPages} 
          disabled={loading}
          className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 text-zinc-600 dark:text-zinc-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <p className="text-zinc-600 dark:text-zinc-300">
            Showing the latest new articles created in the main namespace.
          </p>
          <select 
            value={limit} 
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm"
          >
            <option value={10}>10</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {pages.length === 0 && !loading ? (
            <div className="text-center py-10 text-zinc-500 italic">No new pages found.</div>
          ) : (
            pages.map((page) => (
              <div key={page.rcid} className="flex flex-col md:flex-row gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <a 
                      href={`https://justapedia.org/wiki/${encodeURIComponent(page.title)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-lg font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {page.title}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                      {page.newlen} bytes
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-zinc-500 mb-2">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="text-zinc-700 dark:text-zinc-300">{page.user}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(page.timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  {page.comment && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 italic">
                      &quot;{page.comment}&quot;
                    </p>
                  )}
                </div>
                
                <div className="flex md:flex-col justify-center gap-2">
                   <a 
                      href={`https://justapedia.org/wiki/index.php?title=${encodeURIComponent(page.title)}&action=history`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 text-xs font-medium text-center bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded hover:bg-zinc-50 dark:hover:bg-zinc-600 transition-colors"
                    >
                      History
                    </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
