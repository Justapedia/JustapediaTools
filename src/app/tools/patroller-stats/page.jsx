"use client";

import { useEffect, useState, Suspense, useMemo, useCallback } from "react";
import axios from "axios";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  Shield,
  Activity,
  Calendar,
  BarChart2,
  PieChart as PieChartIcon,
  CheckCircle,
  AlertTriangle,
  FileText,
  User,
  ArrowLeft,
  Filter,
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
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ff6b6b", "#4ecdc4"];

export default function PatrollerStats() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-zinc-500">Loading tool...</div>}>
      <PatrollerStatsContent />
    </Suspense>
  );
}

function PatrollerStatsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const [logs, setLogs] = useState([]);
  const [userData, setUserData] = useState(null);

  const handleSearch = useCallback(async (userArg) => {
    const userToSearch = typeof userArg === "string" ? userArg : username;
    if (!userToSearch.trim()) return;

    // Update URL (only if changed to avoid aborting in-flight RSC fetches)
    const params = new URLSearchParams(searchParams);
    params.set("username", userToSearch);
    const next = `${pathname}?${params.toString()}`;
    const current = `${pathname}?${searchParams.toString()}`;
    if (next !== current) {
      router.replace(next);
    }

    setHasSearched(true);
    setLoading(true);
    setError("");
    setLogs([]);
    setProgress(0);
    setUserData(null);

    try {
      // 1. Fetch User Info (to check if exists and get rights)
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
        throw new Error(`User "${userToSearch}" not found.`);
      }
      setUserData(userObj);

      // 2. Fetch Log Events
      // We want all logs where this user is the performer (leuser)
      const allLogs = [];
      let lecontinue = null;
      let fetchedCount = 0;
      const HARD_LIMIT = 50000; // Safety cap

      do {
        const logParams = {
          action: "query",
          list: "logevents",
          leuser: userToSearch,
          lelimit: 500,
          leprop: "ids|title|type|user|timestamp|comment|details",
          format: "json",
          // origin: "*",
        };

        if (lecontinue) logParams.lecontinue = lecontinue;

        const logRes = await axios.get("/api/justapedia", { params: logParams });
        
        if (logRes.data?.error) {
           throw new Error(logRes.data.error.info || "API Error fetching logs");
        }

        const batch = logRes.data?.query?.logevents || [];
        allLogs.push(...batch);
        fetchedCount += batch.length;
        setProgress(fetchedCount);

        if (fetchedCount >= HARD_LIMIT) break;

        lecontinue = logRes.data?.continue?.lecontinue;
      } while (lecontinue);

      setLogs(allLogs);

    } catch (err) {
      setError(err.message || "An error occurred while fetching data.");
    } finally {
      setLoading(false);
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
    if (!logs.length) return null;

    const typeCounts = {};
    const actionCounts = {}; // More granular: type/action
    const timeData = {}; // by month YYYY-MM
    
    logs.forEach(log => {
        // Count by Type
        typeCounts[log.type] = (typeCounts[log.type] || 0) + 1;

        // Count by Action (e.g. protect/protect vs protect/unprotect)
        const actionKey = `${log.type}/${log.action || 'unknown'}`;
        actionCounts[actionKey] = (actionCounts[actionKey] || 0) + 1;

        // Time Series
        const date = new Date(log.timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        timeData[monthKey] = (timeData[monthKey] || 0) + 1;
    });

    // Prepare chart data
    const typeChartData = Object.entries(typeCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const timeChartData = Object.entries(timeData)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Summary Totals
    const totalPatrols = typeCounts['patrol'] || 0;
    const totalBlocks = typeCounts['block'] || 0;
    const totalProtections = typeCounts['protect'] || 0;
    const totalDeletions = typeCounts['delete'] || 0;
    const totalRights = typeCounts['rights'] || 0;
    
    // Admin-like score (rough heuristic)
    const adminActions = totalBlocks + totalProtections + totalDeletions + totalRights + (typeCounts['import'] || 0) + (typeCounts['merge'] || 0);

    return {
        typeCounts,
        actionCounts,
        typeChartData,
        timeChartData,
        totalPatrols,
        totalBlocks,
        totalProtections,
        totalDeletions,
        adminActions,
        totalActions: logs.length
    };
  }, [logs]);


  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Patroller Stats
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Analyze patrol logs, administrative actions, and maintenance activity.
          </p>
        </div>
        <Link
            href="/jptools"
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
                Fetched {progress.toLocaleString()} logs...
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
            <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full">
                    <User className="w-6 h-6 text-blue-700 dark:text-blue-300" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{userData.name}</h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        <span>Groups: <span className="font-medium text-zinc-900 dark:text-zinc-200">{userData.groups?.join(", ") || "none"}</span></span>
                        <span>•</span>
                        <span>Registered: {new Date(userData.registration).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Total Edits: {userData.editcount.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard 
                        title="Total Log Actions" 
                        value={stats.totalActions} 
                        icon={<Activity className="w-5 h-5" />} 
                        color="blue" 
                    />
                    <StatsCard 
                        title="Patrols Performed" 
                        value={stats.totalPatrols} 
                        icon={<CheckCircle className="w-5 h-5" />} 
                        color="green" 
                    />
                    <StatsCard 
                        title="Admin Actions" 
                        value={stats.adminActions} 
                        subtitle="(Block, Protect, Delete, etc.)"
                        icon={<Shield className="w-5 h-5" />} 
                        color="red" 
                    />
                     <StatsCard 
                        title="Deletions" 
                        value={stats.totalDeletions} 
                        icon={<FileText className="w-5 h-5" />} 
                        color="orange" 
                    />
                </div>
            )}

            {/* Charts Section */}
            {stats && stats.typeChartData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Activity Over Time */}
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-zinc-900 dark:text-white">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            Activity Over Time
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.timeChartData}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{fontSize: 12}} 
                                        tickFormatter={(val) => val.split("-").join("/")}
                                        minTickGap={30}
                                    />
                                    <YAxis />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: "8px", color: "#fff" }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Action Distribution */}
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-zinc-900 dark:text-white">
                            <PieChartIcon className="w-5 h-5 text-purple-500" />
                            Action Distribution
                        </h3>
                        <div className="h-[300px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.typeChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {stats.typeChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: "8px", color: "#fff" }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            ) : (
                <div className="text-center py-10 text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                    No log activity found for this user.
                </div>
            )}

            {/* Detailed Stats Table */}
             {stats && (
                <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50">
                        <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Detailed Action Breakdown
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Log Type</th>
                                    <th className="px-6 py-3">Specific Action</th>
                                    <th className="px-6 py-3 text-right">Count</th>
                                    <th className="px-6 py-3 text-right">% of Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                {Object.entries(stats.actionCounts)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([key, count]) => {
                                        const [type, action] = key.split("/");
                                        return (
                                            <tr key={key} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-200 capitalize">{type}</td>
                                                <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400 capitalize">{action.replace(/_/g, " ")}</td>
                                                <td className="px-6 py-3 text-right text-zinc-900 dark:text-zinc-200 font-mono">{count.toLocaleString()}</td>
                                                <td className="px-6 py-3 text-right text-zinc-500">
                                                    {((count / stats.totalActions) * 100).toFixed(1)}%
                                                </td>
                                            </tr>
                                        );
                                    })}
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
