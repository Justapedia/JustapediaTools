"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import axios from "axios";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, PieChart, AlertCircle, FileText, User, Info, ArrowUpRight } from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ff7300", "#d0ed57", "#a4de6c", "#d0ed57"];

export default function Authorship() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-zinc-500">Loading tool...</div>}>
      <AuthorshipContent />
    </Suspense>
  );
}

function AuthorshipContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const fetchAuthorship = useCallback(async (overrideTitle) => {
    const t = (typeof overrideTitle === "string" ? overrideTitle : title).trim();
    if (!t) return;

    // Update URL if changed
    if (searchParams.get("title") !== t) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("title", t);
      router.replace(`${pathname}?${params.toString()}`);
    }

    setLoading(true);
    setError("");
    setData(null);

    try {
      // 1. Verify Page Exists
      const infoReq = await axios.get("/api/justapedia", {
        params: {
          action: "query",
          titles: t,
          prop: "info",
          format: "json",
          // origin: "*",
        },
      });
      const pageInfo = Object.values(infoReq.data?.query?.pages || {})[0];
      if (!pageInfo || pageInfo.missing !== undefined) {
        throw new Error("Page not found.");
      }

      // 2. Fetch Revisions (Simulating token analysis via added bytes)
      const revisions = await fetchAllRevisions(t);
      const stats = analyzeRevisions(revisions);

      setData({
        title: pageInfo.title,
        ...stats,
      });

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch authorship data.");
    } finally {
      setLoading(false);
    }
  }, [title, searchParams, pathname, router]);

  useEffect(() => {
    const t = searchParams.get("title");
    if (t) {
      setTitle(t);
      fetchAuthorship(t);
    }
  }, [searchParams, fetchAuthorship]);

  const fetchAllRevisions = async (pageTitle) => {
    let allRevs = [];
    let rvcontinue = null;
    let count = 0;
    const MAX_REVS = 5000;

    while (count < MAX_REVS) {
      const params = {
        action: "query",
        prop: "revisions",
        titles: pageTitle,
        rvprop: "user|size|timestamp",
        rvlimit: "max",
        format: "json",
        // origin: "*",
      };
      if (rvcontinue) params.rvcontinue = rvcontinue;

      const res = await axios.get("/api/justapedia", { params });
      const pages = res.data?.query?.pages;
      const pageId = Object.keys(pages || {})[0];
      const revs = pages?.[pageId]?.revisions || [];
      
      allRevs = [...allRevs, ...revs];
      count += revs.length;

      if (!res.data.continue?.rvcontinue) break;
      rvcontinue = res.data.continue.rvcontinue;
    }
    
    // Sort Newest -> Oldest
    return allRevs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const analyzeRevisions = (revs) => {
    const userAdded = {};
    const reversedRevs = [...revs].reverse(); // Oldest -> Newest

    reversedRevs.forEach((rev, i) => {
      const prevSize = i > 0 ? reversedRevs[i - 1].size : 0;
      const diff = rev.size - prevSize;
      
      // Only count positive additions as "Authorship" contribution proxy
      if (diff > 0) {
        userAdded[rev.user] = (userAdded[rev.user] || 0) + diff;
      }
    });

    const authorship = Object.entries(userAdded)
      .sort((a, b) => b[1] - a[1])
      .map(([user, chars]) => ({ user, chars }));

    const totalChars = authorship.reduce((acc, curr) => acc + curr.chars, 0);
    const uniqueAuthors = authorship.length;

    return {
      authorship,
      totalChars,
      uniqueAuthors,
      latestRev: revs[0],
    };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
        <PieChart className="w-8 h-8 text-orange-500" /> Authorship
      </h1>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter page title (e.g. Main Page)"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-orange-500 outline-none"
              onKeyDown={(e) => e.key === "Enter" && fetchAuthorship()}
            />
          </div>
          <button
            onClick={() => fetchAuthorship()}
            disabled={loading}
            className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Analyze"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}



      {data && (
        <div className="space-y-6">
          {/* Summary Section */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
             <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
               <FileText className="w-5 h-5 text-green-500" /> Summary
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                   <div className="text-zinc-500 mb-1">Article</div>
                   <div className="font-bold text-lg">{data.title}</div>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                   <div className="text-zinc-500 mb-1">Unique Authors</div>
                   <div className="font-bold text-lg">{data.uniqueAuthors.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                   <div className="text-zinc-500 mb-1">Total Characters Added</div>
                   <div className="font-bold text-lg">{data.totalChars.toLocaleString()}</div>
                </div>
             </div>
181-             <p className="mt-4 text-xs text-zinc-500 flex items-center gap-1">
               Scanned revision: {new Date(data.latestRev.timestamp).toLocaleString()} by
               <a
                 href={`https://justapedia.org/wiki/User:${encodeURIComponent(data.latestRev.user)}`}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-blue-600 dark:text-blue-400 hover:underline"
               >
                 {data.latestRev.user}
               </a>
             </p>
          </div>

          {/* Authorship Graph & List */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-500" /> Authorship
            </h3>

            
            <div className="flex flex-col lg:flex-row gap-8">
               {/* List */}
               <div className="flex-1 max-h-[500px] overflow-y-auto pr-2">
                  <table className="w-full text-sm">
                     <thead className="text-left text-zinc-500 bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                        <tr>
                           <th className="p-2 rounded-l-lg">Rank</th>
                           <th className="p-2">User</th>
                           <th className="p-2 text-right">Characters</th>
                           <th className="p-2 rounded-r-lg text-right">%</th>
                        </tr>
                     </thead>
                     <tbody>
                        {data.authorship.map((author, index) => (
                           <tr key={author.user} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                              <td className="p-2 font-medium text-zinc-500">{index + 1}</td>
                              <td className="p-2 font-medium text-blue-600 dark:text-blue-400">
                                 <a 
                                   href={`https://justapedia.org/wiki/User:${encodeURIComponent(author.user)}`}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="hover:underline"
                                 >
                                   {author.user}
                                 </a>
                              </td>
                              <td className="p-2 text-right">{author.chars.toLocaleString()}</td>
                              <td className="p-2 text-right text-zinc-500">
                                 {((author.chars / data.totalChars) * 100).toFixed(1)}%
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               {/* Chart */}
               <div className="flex-1 min-h-[400px]">
                  <ResponsiveContainer width="100%" height={400}>
                    <RechartsPieChart>
                      <Pie
                        data={data.authorship}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="chars"
                        nameKey="user"
                        label={({ name, percent }) => percent > 0.02 ? `${name}` : ''}
                      >
                        {data.authorship.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index < 10 ? COLORS[index % COLORS.length] : "#9ca3af"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value.toLocaleString() + " characters"} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
