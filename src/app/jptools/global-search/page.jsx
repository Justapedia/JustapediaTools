"use client";

import { useState, useEffect, Suspense } from "react";
import axios from "axios";
import { Search, Globe, ChevronLeft, ChevronRight, AlertCircle, FileText, ExternalLink } from "lucide-react";

function GlobalSearchContent() {
  const [query, setQuery] = useState("");
  const [namespace, setNamespace] = useState("all"); // "all" or specific ID
  const [namespacesMap, setNamespacesMap] = useState({});
  const [results, setResults] = useState([]);
  const [totalHits, setTotalHits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [searched, setSearched] = useState(false);

  // Fetch namespaces on mount
  useEffect(() => {
    const fetchNamespaces = async () => {
      try {
        const res = await axios.get("/api/justapedia", {
          params: {
            action: "query",
            meta: "siteinfo",
            siprop: "namespaces",
            format: "json",
            // origin: "*",
          },
        });
        const ns = res.data?.query?.namespaces;
        if (ns) {
          const map = {};
          Object.values(ns).forEach((n) => {
            // Filter out negative namespaces if needed, but usually valid for search?
            // MediaWiki usually allows searching in valid content namespaces.
            // Let's keep them all for now.
            map[n.id] = n["*"] || "(Main)";
          });
          setNamespacesMap(map);
        }
      } catch (e) {
        console.error("Failed to fetch namespaces", e);
        // Fallback
        setNamespacesMap({ 0: "(Main)" });
      }
    };
    fetchNamespaces();
  }, []);

  const handleSearch = async (newOffset = 0) => {
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setSearched(true);
    if (newOffset === 0) setOffset(0);

    try {
      // Prepare srnamespace param
      let srnamespace = namespace;
      if (namespace === "all") {
        // If "all", we might need to pass all IDs or omit it?
        // Usually omitting it defaults to 0 (Main).
        // To search all, we need to pass all IDs joined by pipe.
        // However, passing too many might hit URL length limits.
        // Let's try to pass the keys of namespacesMap.
        const allIds = Object.keys(namespacesMap).filter(id => parseInt(id) >= 0).join("|");
        srnamespace = allIds;
      }

      const params = {
        action: "query",
        list: "search",
        srsearch: query,
        srlimit: 20,
        sroffset: newOffset,
        format: "json",
        // origin: "*",
      };

      if (namespace !== "all") {
        params.srnamespace = namespace;
      } else {
        // If "all", pass all positive namespace IDs
        const allIds = Object.keys(namespacesMap).filter(id => parseInt(id) >= 0).join("|");
        if (allIds) params.srnamespace = allIds;
      }

      const res = await axios.get("/api/justapedia", { params });
      
      if (res.data?.error) {
        throw new Error(res.data.error.info || "API Error");
      }

      const searchResults = res.data?.query?.search || [];
      const total = res.data?.query?.searchinfo?.totalhits || 0;

      setResults(searchResults);
      setTotalHits(total);
      setOffset(newOffset);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch search results. " + (err.message || ""));
      setResults([]);
      setTotalHits(0);
    } finally {
      setLoading(false);
    }
  };

  const onPageChange = (newOffset) => {
    handleSearch(newOffset);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 rounded-2xl text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-8 h-8 text-emerald-100" />
          <h1 className="text-3xl font-bold">Global Search</h1>
        </div>
        <p className="text-emerald-50 max-w-2xl">
          Search across all namespaces and pages on Justapedia.
        </p>
      </div>

      {/* Search Controls */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">
              Search Query
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(0)}
                placeholder="Enter keywords..."
                className="w-full p-2 pl-10 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-zinc-400" />
            </div>
          </div>

          <div className="w-full md:w-64">
            <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">
              Namespace
            </label>
            <select
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className="w-full p-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Namespaces</option>
              {Object.entries(namespacesMap).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => handleSearch(0)}
              disabled={loading || !query.trim()}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Results */}
      {searched && !loading && !error && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Results: {totalHits.toLocaleString()} hits
            </h2>
          </div>

          {results.length === 0 ? (
            <div className="text-center p-8 text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.pageid}
                  className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        <a
                          href={`https://justapedia.org/wiki/${encodeURIComponent(result.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          {result.title}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </h3>
                      <div className="text-xs text-zinc-500 mt-1 mb-2">
                        Page ID: {result.pageid} • Size: {result.size.toLocaleString()} bytes • Words: {result.wordcount.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 whitespace-nowrap">
                      {new Date(result.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div 
                    className="text-sm text-zinc-700 dark:text-zinc-300 search-snippet"
                    dangerouslySetInnerHTML={{ __html: result.snippet }} 
                  />
                </div>
              ))}

              {/* Pagination */}
              {totalHits > 20 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    onClick={() => onPageChange(offset - 20)}
                    disabled={offset === 0}
                    className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 border border-zinc-200 dark:border-zinc-700"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium">
                    {offset + 1}-{Math.min(offset + 20, totalHits)} of {totalHits}
                  </span>
                  <button
                    onClick={() => onPageChange(offset + 20)}
                    disabled={offset + 20 >= totalHits}
                    className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 border border-zinc-200 dark:border-zinc-700"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <style jsx global>{`
        .search-snippet .searchmatch {
          font-weight: bold;
          background-color: rgba(16, 185, 129, 0.2); /* Emerald-500 with opacity */
          color: inherit;
          padding: 0 2px;
          border-radius: 2px;
        }
        .dark .search-snippet .searchmatch {
           background-color: rgba(16, 185, 129, 0.4);
        }
      `}</style>
    </div>
  );
}

export default function GlobalSearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading Global Search...</div>}>
      <GlobalSearchContent />
    </Suspense>
  );
}
