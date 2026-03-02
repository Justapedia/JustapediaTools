"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Search, FileText, Filter, Calendar, AlertCircle, ExternalLink, CheckSquare, Square } from "lucide-react";

const NAMESPACES = [
  { id: 0, name: "(Main)" },
  { id: 1, name: "Talk" },
  { id: 2, name: "User" },
  { id: 3, name: "User talk" },
  { id: 4, name: "Justapedia" },
  { id: 5, name: "Justapedia talk" },
  { id: 6, name: "File" },
  { id: 10, name: "Template" },
  { id: 14, name: "Category" },
  { id: 828, name: "Module" },
];

export default function AdvancedSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedNamespaces, setSelectedNamespaces] = useState([0]);
  const [sort, setSort] = useState("relevance"); // relevance, last_edit_desc, create_timestamp_desc
  const [hasSearched, setHasSearched] = useState(false);

  const toggleNamespace = (id) => {
    setSelectedNamespaces(prev => 
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError("");
    setHasSearched(true);
    setResults([]);

    try {
      const params = {
        action: "query",
        list: "search",
        srsearch: query,
        srnamespace: selectedNamespaces.join("|"),
        srsort: sort,
        srlimit: 50,
        srprop: "snippet|timestamp|wordcount|size",
      format: "json",
      // origin: "*"
      };

      const res = await axios.get("/api/justapedia", { params });
      
      if (res.data.error) {
        throw new Error(res.data.error.info);
      }

      setResults(res.data.query?.search || []);
    } catch (err) {
      setError(err.message || "Failed to perform search");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
        <Search className="w-8 h-8 text-blue-500" /> Advanced Search
      </h1>
      
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-6">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search for pages..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none text-lg"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <Filter className="w-4 h-4" /> Namespaces
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {NAMESPACES.map(ns => (
                <button
                  key={ns.id}
                  onClick={() => toggleNamespace(ns.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
                    selectedNamespaces.includes(ns.id)
                      ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300"
                      : "bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {selectedNamespaces.includes(ns.id) ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {ns.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <Calendar className="w-4 h-4" /> Sort Order
            </h3>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="relevance">Relevance</option>
              <option value="last_edit_desc">Date (Newest Edit First)</option>
              <option value="create_timestamp_desc">Date (Newest Created First)</option>
              <option value="just_match">Random / None</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {hasSearched && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Results ({results.length})
          </h2>
          
          {results.length === 0 ? (
            <p className="text-zinc-500 italic">No results found.</p>
          ) : (
            <div className="grid gap-4">
              {results.map((result) => (
                <div key={result.pageid} className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                  <div className="flex justify-between items-start">
                    <a
                      href={`https://justapedia.org/wiki/${encodeURIComponent(result.title)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-lg font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
                    >
                      {result.title}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <span className="text-xs text-zinc-400">
                      {new Date(result.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div 
                    className="mt-2 text-zinc-600 dark:text-zinc-300 text-sm search-snippet"
                    dangerouslySetInnerHTML={{ __html: result.snippet + "..." }}
                  />
                  
                  <div className="mt-3 flex gap-4 text-xs text-zinc-400">
                    <span>{result.wordcount} words</span>
                    <span>{(result.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        .search-snippet .searchmatch {
          font-weight: bold;
          background-color: rgba(255, 255, 0, 0.2);
          color: inherit;
        }
        .dark .search-snippet .searchmatch {
          background-color: rgba(255, 255, 0, 0.15);
          color: #fff;
        }
      `}</style>
    </div>
  );
}
