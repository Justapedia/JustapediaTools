"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import axios from "axios";
import { FileText, ArrowUpRight, Search as SearchIcon, ChevronLeft, ChevronRight } from "lucide-react";

function LargestPagesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [allPages, setAllPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [namespaceId, setNamespaceId] = useState("0"); // Default Main
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  // Namespaces
  const [namespacesMap, setNamespacesMap] = useState({});

  const fetchData = useCallback(async (overrideNs) => {
    setLoading(true);
    setError("");
    setAllPages([]);
    setCurrentPage(1);

    const ns = overrideNs !== undefined ? overrideNs : namespaceId;

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    if (ns !== "0") params.set("namespace", ns); else params.delete("namespace");
    params.delete("pattern"); // Clean up old params
    params.delete("invert");
    
    const newSearchString = params.toString();
    if (newSearchString !== searchParams.toString()) {
      router.replace(`${pathname}?${newSearchString}`);
    }

    try {
      if (ns === "0") {
        await fetchLongPages();
      } else {
        await fetchViaAllPages(ns);
      }
    } catch (err) {
      setError("Failed to fetch pages.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [namespaceId, searchParams, pathname, router]);

  useEffect(() => {
    fetchNamespaces();
    
    const nsParam = searchParams.get("namespace");

    if (nsParam) {
      setNamespaceId(nsParam);
      fetchData(nsParam);
    } else {
      fetchData("0");
    }
  }, [searchParams, fetchData]);

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
          map[n.id] = n["*"] || "(Main)";
        });
        setNamespacesMap(map);
      }
    } catch {
      setNamespacesMap({ 0: "(Main)" });
    }
  };

  const fetchLongPages = async () => {
    const response = await axios.get("/api/justapedia", {
      params: {
        action: "query",
        list: "querypage",
        qppage: "Longpages",
        qplimit: 500, // Fetch top 500
        format: "json",
        // origin: "*",
      },
    });

    const results = response.data?.query?.querypage?.results || [];
    setAllPages(results);
  };

  const fetchViaAllPages = async (ns) => {
    let allResults = [];
    let gapcontinue = "";
    
    try {
      // Fetch up to 5000 pages to ensure we find the largest ones
      // Using generator=allpages because list=search doesn't reliably list all pages
      while (allResults.length < 5000) {
        const params = {
          action: "query",
          generator: "allpages",
          gapnamespace: ns,
          gaplimit: 500, // Fetch in chunks
          gapfilterredir: "nonredirects",
          prop: "info|revisions",
          rvprop: "timestamp",
          format: "json",
          // origin: "*"
        };
        
        if (gapcontinue) params.gapcontinue = gapcontinue;

        const response = await axios.get("/api/justapedia", { params });
        const pages = response.data?.query?.pages || {};
        const pageList = Object.values(pages);
        
        allResults = [...allResults, ...pageList];
        
        if (response.data?.continue?.gapcontinue) {
          gapcontinue = response.data.continue.gapcontinue;
        } else {
          break;
        }
      }

      const mapped = allResults.map(r => ({
        title: r.title,
        value: r.length, 
        ns: r.ns,
        timestamp: r.revisions?.[0]?.timestamp || r.touched
      }));

      // Sort by size descending
      mapped.sort((a, b) => b.value - a.value);

      setAllPages(mapped);
    } catch (err) {
      console.error("Error fetching pages:", err);
      setError("Failed to fetch pages.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const currentNamespaceLabel = namespacesMap[namespaceId] || `NS ${namespaceId}`;
  
  // Pagination Logic
  const totalPages = Math.ceil(allPages.length / PAGE_SIZE);
  const displayedPages = allPages.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
        <FileText className="w-8 h-8 text-yellow-500" /> Largest Pages
      </h1>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-4">
         <p className="text-sm text-zinc-600 dark:text-zinc-300">
            The Largest Pages tool shows the largest pages on a Justapedia wiki, measured by wikitext byte size.
            Select a namespace to filter results.
         </p>

         <form onSubmit={handleSubmit} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Namespace</label>
              <select
                value={namespaceId}
                onChange={(e) => setNamespaceId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-yellow-500 outline-none"
              >
                <option value="0">Main namespace</option>
                {/* <option value="*">All namespaces</option> */}
                {Object.entries(namespacesMap)
                  .filter(([id]) => id !== "0")
                  .map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
               <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
               >
                  <SearchIcon className="w-4 h-4" />
                  {loading ? "Loading..." : "Filter"}
               </button>
            </div>
         </form>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500 animate-pulse">Fetching pages...</div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
             <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Found {allPages.length} pages in {currentNamespaceLabel}
             </div>
             <div className="text-xs text-zinc-500">
                Sorted by size (descending)
             </div>
          </div>
          
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                <th className="px-6 py-3 font-semibold text-zinc-900 dark:text-white w-20">Rank</th>
                <th className="px-6 py-3 font-semibold text-zinc-900 dark:text-white">Page Title</th>
                <th className="px-6 py-3 font-semibold text-zinc-900 dark:text-white">Namespace</th>
                <th className="px-6 py-3 font-semibold text-zinc-900 dark:text-white text-right">Size (bytes)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {displayedPages.map((page, index) => (
                <tr key={`${page.title}-${index}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-3 text-zinc-500 font-mono">
                    {(currentPage - 1) * PAGE_SIZE + index + 1}
                  </td>
                  <td className="px-6 py-3 font-medium text-blue-600 dark:text-blue-400">
                    <a href={`https://justapedia.org/wiki/${encodeURIComponent(page.title)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
                      {page.title}
                      <ArrowUpRight className="w-3 h-3 opacity-50" />
                    </a>
                  </td>
                  <td className="px-6 py-3 text-zinc-500">
                     {namespacesMap[page.ns] || page.ns}
                  </td>
                  <td className="px-6 py-3 text-zinc-700 dark:text-zinc-300 text-right font-mono">
                    {page.value ? parseInt(page.value).toLocaleString() : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {allPages.length === 0 && !error && (
             <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-2">
                <SearchIcon className="w-8 h-8 opacity-20" />
                <p>No pages found matching your criteria.</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LargestPages() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-zinc-500">Loading tool...</div>}>
      <LargestPagesContent />
    </Suspense>
  );
}
