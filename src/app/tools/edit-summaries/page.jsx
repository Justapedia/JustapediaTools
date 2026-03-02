"use client";

import { useEffect, useState, Suspense, useMemo, useCallback } from "react";
import axios from "axios";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  FileText,
  Calendar,
  BarChart2,
  PieChart as PieChartIcon,
  CheckCircle,
  AlertTriangle,
  User,
  ArrowLeft,
  Filter,
  TrendingUp,
  Percent,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ff6b6b"];

export default function EditSummaries() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-zinc-500">Loading tool...</div>}>
      <EditSummariesContent />
    </Suspense>
  );
}

function EditSummariesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const [contribs, setContribs] = useState([]);
  const [userData, setUserData] = useState(null);

  const handleSearch = useCallback(async (userArg) => {
    const userToSearch = typeof userArg === "string" ? userArg : username;
    if (!userToSearch.trim()) return;

    // Update URL
    const params = new URLSearchParams(searchParams);
    params.set("username", userToSearch);
    router.replace(`${pathname}?${params.toString()}`);

    setHasSearched(true);
    setLoading(true);
    setError("");
    setContribs([]);
    setProgress(0);
    setUserData(null);

    try {
      // 1. Fetch User Info
      const userRes = await axios.get("/api/justapedia", {
        params: {
          action: "query",
          list: "users",
          ususers: userToSearch,
          usprop: "groups|registration|editcount|gender",
          format: "json",
          // origin: "*",
        },
      });

      const userObj = userRes.data?.query?.users?.[0];
      if (!userObj || userObj.missing !== undefined) {
        throw new Error("User not found.");
      }
      setUserData(userObj);

      // 2. Fetch Contributions
      let allContribs = [];
      let uccontinue = null;
      const MAX_CONTRIBS = 3000;

      while (allContribs.length < MAX_CONTRIBS) {
        const cParams = {
          action: "query",
          list: "usercontribs",
          ucuser: userToSearch,
          ucprop: "comment|timestamp|title|flags|size|sizediff",
          uclimit: "max",
          format: "json",
          // origin: "*",
        };
        if (uccontinue) cParams.uccontinue = uccontinue;

        const cRes = await axios.get("/api/justapedia", { params: cParams });
        const batch = cRes.data?.query?.usercontribs || [];
        allContribs = [...allContribs, ...batch];
        
        // Progress update
        setProgress(Math.min(100, Math.floor((allContribs.length / MAX_CONTRIBS) * 100)));

        if (!cRes.data?.continue) break;
        uccontinue = cRes.data.continue.uccontinue;
      }

      setContribs(allContribs);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch data.");
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, [username, searchParams, pathname, router]);

  // Load username from URL on mount
  useEffect(() => {
    const u = searchParams.get("username");
    if (u) {
      setUsername(u);
    }
  }, [searchParams]);

  const stats = useMemo(() => {
    if (!contribs.length) return null;

    let totalEdits = 0;
    let withSummary = 0;
    let withoutSummary = 0;
    let minorEdits = 0;
    let majorEdits = 0;
    let autoSummaryOnly = 0; // Section edits without extra text

    const monthlyData = {}; // Key: YYYY-MM
    const yearlyData = {};  // Key: YYYY

    // Helper to init bucket
    const initBucket = () => ({ total: 0, withSum: 0, minor: 0 });

    contribs.forEach(c => {
        totalEdits++;
        
        // Minor check
        const isMinor = c.hasOwnProperty('minor');
        if (isMinor) minorEdits++;
        else majorEdits++;

        // Summary check
        const comment = c.comment || "";
        const hasText = comment.trim().length > 0;
        
        // Check for auto-summary (Section edit only)
        // Regex: starts with /* ... */ and has nothing else non-whitespace
        const isAutoOnly = /^\/\*.*?\*\/\s*$/.test(comment);

        if (hasText && !isAutoOnly) {
            withSummary++;
        } else {
            withoutSummary++; // We count auto-only as "no manual summary" effectively, or separate?
            // User request: "Summary usage". Usually implies *useful* summary.
            // Let's count "Auto Only" as a separate stat but for "With Summary" usually means ANY summary in MediaWiki stats.
            // However, quality analysis usually demands manual input.
            // Let's stick to standard: If comment is not empty, it has a summary.
        }

        if (isAutoOnly) autoSummaryOnly++;

        // Time buckets
        const date = new Date(c.timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const yearKey = `${date.getFullYear()}`;

        if (!monthlyData[monthKey]) monthlyData[monthKey] = initBucket();
        if (!yearlyData[yearKey]) yearlyData[yearKey] = initBucket();

        monthlyData[monthKey].total++;
        yearlyData[yearKey].total++;

        if (hasText) {
             monthlyData[monthKey].withSum++;
             yearlyData[yearKey].withSum++;
        }
        if (isMinor) {
            monthlyData[monthKey].minor++;
            yearlyData[yearKey].minor++;
        }
    });

    // Recalculate strict "With Summary" (MediaWiki standard is just non-empty)
    // But for "Usage", let's use the standard count (hasText) for the main KPI,
    // and show Auto-only as a detail.
    const standardWithSummary = contribs.filter(c => (c.comment || "").trim().length > 0).length;
    const standardWithoutSummary = totalEdits - standardWithSummary;

    // Prepare chart data
    const timelineData = Object.entries(monthlyData)
        .map(([date, d]) => ({
            date,
            usageRate: d.total ? parseFloat(((d.withSum / d.total) * 100).toFixed(1)) : 0,
            minorRate: d.total ? parseFloat(((d.minor / d.total) * 100).toFixed(1)) : 0,
            edits: d.total
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const summaryPieData = [
        { name: "With Summary", value: standardWithSummary },
        { name: "No Summary", value: standardWithoutSummary },
    ];

    const typePieData = [
        { name: "Major Edits", value: majorEdits },
        { name: "Minor Edits", value: minorEdits },
    ];

    return {
        totalEdits,
        withSummary: standardWithSummary,
        withoutSummary: standardWithoutSummary,
        usageRate: totalEdits ? ((standardWithSummary / totalEdits) * 100).toFixed(1) : "0.0",
        minorEdits,
        majorEdits,
        minorRate: totalEdits ? ((minorEdits / totalEdits) * 100).toFixed(1) : "0.0",
        autoSummaryOnly,
        timelineData,
        summaryPieData,
        typePieData,
        monthlyData, // raw
        yearlyData   // raw
    };
  }, [contribs]);


  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <FileText className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            Edit Summaries
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Analyze edit summary usage, minor vs major edits, and consistency over time.
          </p>
        </div>
        <Link
            href="/jptools"
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
        >
            <ArrowLeft className="w-4 h-4" /> Back to Tools
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col md:flex-row gap-4"
        >
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (e.g. Sourav)"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
                <>
                 <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                 Scanning...
                </>
            ) : (
                <>
                 <Search className="w-4 h-4" /> Analyze
                </>
            )}
          </button>
        </form>
        {loading && progress > 0 && (
            <div className="mt-4 text-sm text-zinc-500 text-center">
                Fetched {progress.toLocaleString()} edits...
            </div>
        )}
        {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {error}
            </div>
        )}
      </div>

      {/* Results */}
      {hasSearched && !loading && !error && userData && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* User Info Header */}
            <div className="flex items-center gap-4 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-100 dark:border-cyan-800">
                <div className="p-3 bg-cyan-100 dark:bg-cyan-800 rounded-full">
                    <User className="w-6 h-6 text-cyan-700 dark:text-cyan-300" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{userData.name}</h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        <span>Analyzed: {stats?.totalEdits.toLocaleString()} edits</span>
                        <span>•</span>
                        <span>Registered: {new Date(userData.registration).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatsCard 
                        title="Summary Usage Rate" 
                        value={`${stats.usageRate}%`} 
                        subtitle={`${stats.withSummary.toLocaleString()} edits with summary`}
                        icon={<Percent className="w-5 h-5" />} 
                        color={parseFloat(stats.usageRate) > 80 ? "green" : parseFloat(stats.usageRate) > 50 ? "yellow" : "red"} 
                    />
                    <StatsCard 
                        title="Minor Edit Rate" 
                        value={`${stats.minorRate}%`} 
                        subtitle={`${stats.minorEdits.toLocaleString()} minor edits`}
                        icon={<CheckCircle className="w-5 h-5" />} 
                        color="blue" 
                    />
                     <StatsCard 
                        title="Major Edits" 
                        value={stats.majorEdits.toLocaleString()} 
                        subtitle="Edits without 'minor' flag"
                        icon={<TrendingUp className="w-5 h-5" />} 
                        color="purple" 
                    />
                </div>
            )}

            {/* Charts Section */}
            {stats && stats.timelineData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Usage Over Time */}
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm col-span-1 lg:col-span-2">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-zinc-900 dark:text-white">
                            <Calendar className="w-5 h-5 text-cyan-500" />
                            Summary Usage & Minor Edits Over Time
                        </h3>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.timelineData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{fontSize: 12}} 
                                        tickFormatter={(val) => val.split("-").join("/")}
                                        minTickGap={30}
                                    />
                                    <YAxis unit="%" domain={[0, 100]} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: "8px", color: "#fff" }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="usageRate" name="Summary Usage %" stroke="#00C49F" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="minorRate" name="Minor Edit %" stroke="#8884d8" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Summary Pie */}
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-zinc-900 dark:text-white">
                            <PieChartIcon className="w-5 h-5 text-green-500" />
                            Summary Presence
                        </h3>
                        <div className="h-[300px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.summaryPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.summaryPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? "#00C49F" : "#FF8042"} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: "8px", color: "#fff" }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Minor vs Major Pie */}
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-zinc-900 dark:text-white">
                            <PieChartIcon className="w-5 h-5 text-purple-500" />
                            Major vs Minor
                        </h3>
                        <div className="h-[300px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.typePieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.typePieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? "#8884d8" : "#0088FE"} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: "8px", color: "#fff" }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            ) : (
                <div className="text-center py-10 text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                    No edits found for this user.
                </div>
            )}

            {/* Detailed Stats Table (Monthly) */}
             {stats && stats.timelineData.length > 0 && (
                <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50">
                        <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Monthly Breakdown
                        </h3>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-medium sticky top-0 backdrop-blur-sm">
                                <tr>
                                    <th className="px-6 py-3">Month</th>
                                    <th className="px-6 py-3 text-right">Total Edits</th>
                                    <th className="px-6 py-3 text-right">With Summary</th>
                                    <th className="px-6 py-3 text-right">Usage %</th>
                                    <th className="px-6 py-3 text-right">Minor %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                {[...stats.timelineData].reverse().map((row) => (
                                    <tr key={row.date} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-200">{row.date}</td>
                                        <td className="px-6 py-3 text-right text-zinc-600 dark:text-zinc-400">{row.edits.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-right text-zinc-600 dark:text-zinc-400">
                                            {Math.round(row.edits * (row.usageRate / 100)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono">
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                row.usageRate > 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                                row.usageRate > 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                                {row.usageRate}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono text-zinc-500">
                                            {row.minorRate}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
             )}

        </div>
      )}
    </div>
  );
}

function StatsCard({ title, value, icon, subtitle, color = "blue" }) {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
        red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
        orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
        purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
        yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
    };

    return (
        <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                    {value !== undefined ? value.toLocaleString() : "-"}
                </p>
                {subtitle && <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
                {icon}
            </div>
        </div>
    );
}
