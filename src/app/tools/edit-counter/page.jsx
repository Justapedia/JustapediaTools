"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import axios from "axios";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  User,
  Calendar,
  BarChart2,
  Shield,
  PieChart as PieChartIcon,
  TrendingUp,
  X,
  ArrowUpRight,
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

function Toggle({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
    </label>
  );
}

export default function EditCounter() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-zinc-500">Loading tool...</div>}>
      <EditCounterContent />
    </Suspense>
  );
}

function EditCounterContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");

  const [options, setOptions] = useState({
    general: true,
    namespaceTotals: true,
    yearCounts: true,
    monthCounts: true,
    topPages: true,
    rightsChanges: true,
  });

  const [maxEdits, setMaxEdits] = useState(1000);
  const [useLocalTime, setUseLocalTime] = useState(false);

  const [contribs, setContribs] = useState([]);
  const [hiddenNamespaces, setHiddenNamespaces] = useState(new Set());
  const [namespacesMap, setNamespacesMap] = useState({});

  const [stats, setStats] = useState({
    namespaceTotals: {},
    yearCounts: {},
    monthCounts: {},
    topPages: [],
    rightsChanges: [],
  });

  // --- helpers to decide when to show sections ---
  const showResults = hasSearched && !loading && !error;
  const showUserBox = showResults && !!data;

  const showContribSections =
    showResults &&
    (options.namespaceTotals || options.yearCounts || options.monthCounts || options.topPages);

  const showRightsSection = showResults && options.rightsChanges;

  useEffect(() => {
    fetchNamespaces();
  }, []);

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

        // Force custom mappings for missing namespaces (requested by user)
        if (!map[4]) map[4] = "Justapedia";
        if (!map[5]) map[5] = "Justapedia talk";
        if (!map[-99]) map[-99] = "Data";
        if (!map[-98]) map[-98] = "Data talk";
        
        setNamespacesMap(map);
      }
    } catch (e) {
      console.error("Failed to fetch namespaces", e);
    }
  };

  const fetchTotalNamespaceCounts = async (user) => {
    const totals = {};
    let totalFetched = 0;
    let continueToken = null;

    try {
      do {
        const params = {
          action: "query",
          list: "usercontribs",
          ucuser: user,
          uclimit: 500,
          ucprop: "ids|title|timestamp|flags|comment|size",
          format: "json",
          // origin: "*",
        };

        if (continueToken) {
          params.uccontinue = continueToken;
        }

        const res = await axios.get("/api/justapedia", { params });
        const contribs = res.data?.query?.usercontribs || [];

        contribs.forEach((c) => {
          totals[c.ns] = (totals[c.ns] || 0) + 1;
        });

        totalFetched += contribs.length;
        continueToken = res.data?.continue?.uccontinue;

        // Safety limit
        if (totalFetched >= 5000000) break;

      } while (continueToken);
      
      return totals;
    } catch (e) {
      console.error("Failed to fetch total namespace counts", e);
      return {};
    }
  };

  const fetchStats = async (userArg, optionsArg) => {
    const rawUser =
      typeof userArg === "string" || userArg === undefined ? userArg ?? username : username;
    const usernameClean = rawUser.trim();
    if (!usernameClean) return;

    // sync URL
    const currentParams = new URLSearchParams(searchParams.toString());
    if (currentParams.get("username") !== usernameClean) {
      currentParams.set("username", usernameClean);
      router.replace(`${pathname}?${currentParams.toString()}`);
    }

    const useOptions = optionsArg ?? options;

    setHasSearched(true);
    setLoading(true);
    setError("");

    // clear old results so nothing shows while loading
    setData(null);
    setContribs([]);
    setHiddenNamespaces(new Set());
    setStats({
      namespaceTotals: {},
      yearCounts: {},
      monthCounts: {},
      topPages: [],
      rightsChanges: [],
    });

    try {
      const response = await axios.get("/api/justapedia", {
        params: {
          action: "query",
          list: "users",
          ususers: usernameClean,
          usprop: "editcount|registration|groups|gender",
          format: "json",
          // origin: "*", // Not needed when using proxy
        },
      });

      const userData = response.data?.query?.users?.[0];

      if (!userData || userData.missing !== undefined) {
        setError("User not found on Justapedia.");
        setLoading(false);
        return;
      }

      setData(userData);

      const needContribs =
        useOptions.namespaceTotals || useOptions.yearCounts || useOptions.monthCounts || useOptions.topPages;

      if (needContribs) {
        const all = await fetchContribs(usernameClean, maxEdits);
        setContribs(all);

        const computed = computeStats(all);
        let finalNamespaceTotals = computed.namespaceTotals;

        // If namespace totals are requested, try to fetch GLOBAL totals via search API
        if (useOptions.namespaceTotals) {
          try {
            // We can run this in parallel with computeStats if we want, but logic here is sequential for clarity
            const globalTotals = await fetchTotalNamespaceCounts(userData.name);
            // Only replace if we got valid data (non-empty object)
            if (globalTotals && Object.keys(globalTotals).length > 0) {
               // Merge with existing to keep any analyzed ones that might be missing from search (unlikely)
               // But actually we want pure global totals.
               // Check if global totals are all 0? No, that might be valid.
               // Let's trust the search API.
               finalNamespaceTotals = globalTotals;
            }
          } catch (e) {
            console.error("Failed to fetch global namespace totals, falling back to analyzed set", e);
          }
        }

        setStats((s) => ({
          ...s,
          namespaceTotals: finalNamespaceTotals,
          yearCounts: computed.yearCounts,
          monthCounts: computed.monthCounts,
          topPages: computed.topPages,
        }));
      }

      if (useOptions.rightsChanges) {
        const rights = await fetchRights(usernameClean);
        setStats((s) => ({ ...s, rightsChanges: rights }));
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Read from URL only once (initial load)
    const u = searchParams.get("username") || searchParams.get("user");
    const section = searchParams.get("section");

    if (u) {
      setUsername(u);

      if (section) {
        const base = {
          general: false,
          namespaceTotals: false,
          yearCounts: false,
          monthCounts: false,
          topPages: false,
          rightsChanges: false,
        };
        const next = { ...base, [section]: true };
        setOptions(next);
      }
      // Don't auto-fetch. User must click Analyze.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchContribs = async (user, max) => {
    let uccontinue = undefined;
    const results = [];
    while (results.length < max) {
      const params = {
        action: "query",
        list: "usercontribs",
        ucuser: user,
        ucprop: "ids|title|timestamp|comment|size|tags|flags",
        uclimit: Math.min(500, max - results.length),
      };
      if (uccontinue) params.uccontinue = uccontinue;

      const res = await axios.get("/api/justapedia", {
        params: { ...params, format: "json" },
      });

      if (res.data?.error) {
        throw new Error(res.data.error.info || "API Error");
      }

      const chunk = res.data?.query?.usercontribs || [];
      results.push(...chunk);

      const cont = res.data?.continue?.uccontinue;
      if (!cont) break;
      uccontinue = cont;
    }
    return results;
  };

  const fetchRights = async (user) => {
    const res = await axios.get("/api/justapedia", {
      params: {
        action: "query",
        list: "logevents",
        letype: "rights",
        letitle: `User:${user}`,
        lelimit: 50,
        format: "json",
        // origin: "*",
      },
    });
    return res.data?.query?.logevents || [];
  };

  const computeStats = (list) => {
    const namespaceTotals = {};
    const yearCounts = {};
    const monthCounts = {};
    const pageCount = {};

    list.forEach((c) => {
      const d = new Date(c.timestamp);
      const year = d.getUTCFullYear();
      const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

      yearCounts[year] = (yearCounts[year] || 0) + 1;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;

      const ns = c.ns ?? 0;
      namespaceTotals[ns] = (namespaceTotals[ns] || 0) + 1;

      pageCount[c.title] = (pageCount[c.title] || 0) + 1;
    });

    const topPages = Object.entries(pageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([title, count]) => ({ title, count }));

    return { namespaceTotals, yearCounts, monthCounts, topPages };
  };

  const maxNamespaceCount = useMemo(() => {
    return Math.max(1, ...Object.values(stats.namespaceTotals));
  }, [stats.namespaceTotals]);

  const filteredContribs = useMemo(() => {
    if (!contribs || hiddenNamespaces.size === 0) return contribs;
    return contribs.filter((c) => !hiddenNamespaces.has(c.ns ?? 0));
  }, [contribs, hiddenNamespaces]);

  const filteredYearCounts = useMemo(() => {
    const yc = {};
    filteredContribs.forEach((c) => {
      const d = new Date(c.timestamp);
      const year = d.getUTCFullYear();
      yc[year] = (yc[year] || 0) + 1;
    });
    return yc;
  }, [filteredContribs]);

  const filteredMonthCounts = useMemo(() => {
    const mc = {};
    filteredContribs.forEach((c) => {
      const d = new Date(c.timestamp);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      mc[key] = (mc[key] || 0) + 1;
    });
    return mc;
  }, [filteredContribs]);

  const formatDateTime = (iso) => {
    const d = new Date(iso);
    return useLocalTime ? d.toLocaleString() : d.toUTCString();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
        <User className="w-8 h-8 text-blue-600" /> Edit Counter
      </h1>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (e.g. Sourav)"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none"
              onKeyDown={(e) => e.key === "Enter" && fetchStats()}
            />
          </div>
          <button
            onClick={() => fetchStats()}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Analyze"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
          <Toggle label="General" checked={options.general} onChange={(v) => setOptions({ ...options, general: v })} />
          <Toggle
            label="Namespace Totals"
            checked={options.namespaceTotals}
            onChange={(v) => setOptions({ ...options, namespaceTotals: v })}
          />
          <Toggle label="Year Counts" checked={options.yearCounts} onChange={(v) => setOptions({ ...options, yearCounts: v })} />
          <Toggle
            label="Month Counts"
            checked={options.monthCounts}
            onChange={(v) => setOptions({ ...options, monthCounts: v })}
          />
          <Toggle label="Top Edited Pages" checked={options.topPages} onChange={(v) => setOptions({ ...options, topPages: v })} />
          <Toggle
            label="Rights Changes"
            checked={options.rightsChanges}
            onChange={(v) => setOptions({ ...options, rightsChanges: v })}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 dark:text-zinc-300">Analyze</span>
            <select
              value={maxEdits}
              onChange={(e) => setMaxEdits(Number(e.target.value))}
              className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              disabled={loading}
            >
              <option value={500}>last 500</option>
              <option value={1000}>last 1000</option>
              <option value={5000}>last 5000</option>
            </select>
            <span className="text-zinc-600 dark:text-zinc-300">edits</span>
          </div>

          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={useLocalTime} onChange={(e) => setUseLocalTime(e.target.checked)} />
            <span className="text-zinc-600 dark:text-zinc-300">Use local time</span>
          </label>

          {loading && (
            <span className="text-zinc-500">
              Fetching data… (user info + logs + contributions)
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>
      )}

      {/* ✅ GENERAL: show only after ALL data finished loading (no “empty” placeholders before search) */}
      {showUserBox && options.general && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <BarChart2 className="w-5 h-5 text-blue-500" />
                <Link
                  href={
                    username
                      ? `/jptools/edit-counter?username=${encodeURIComponent(username)}&section=general`
                      : "#"
                  }
                  className="font-semibold text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  General
                </Link>
              </div>
              <a
                href={`https://justapedia.org/wiki/User:${encodeURIComponent(username)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                User Page <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white">{data.editcount?.toLocaleString()}</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">Registration</span>
            </div>
            <p className="text-lg font-medium text-zinc-900 dark:text-white">
              {data.registration ? new Date(data.registration).toLocaleDateString() : "Unknown"}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-purple-500" />
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">User Groups</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(data.groups) && data.groups.length > 0 ? (
                data.groups.map((group) => (
                  <span key={group} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-medium">
                    {group}
                  </span>
                ))
              ) : (
                <span className="text-sm text-zinc-500">None</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ ALL OTHER SECTIONS: do NOT render at all until loading is finished */}
      {showResults && (
        <div className="space-y-6">
          {/* Namespace Totals */}
          {options.namespaceTotals && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <PieChartIcon className="w-5 h-5 text-purple-600" />
                <Link
                  href={
                    username
                      ? `/jptools/edit-counter?username=${encodeURIComponent(username)}&section=namespaceTotals`
                      : "#"
                  }
                  className="font-semibold hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Namespace Totals
                </Link>
              </div>

              {Object.keys(stats.namespaceTotals).length === 0 ? (
                <div className="text-sm text-zinc-500">No contributions found.</div>
              ) : (
                <>
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 space-y-2">
                      {Object.entries(stats.namespaceTotals).map(([ns, count]) => (
                        <div key={ns} className="flex items-center gap-3">
                          <a
                            href={`https://justapedia.org/wiki/Special:Contributions/${encodeURIComponent(
                              username
                            )}?namespace=${ns}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-32 text-sm text-zinc-500 truncate hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                            title={namespacesMap[ns] || `NS ${ns}`}
                          >
                            {namespacesMap[ns] || `NS ${ns}`}
                          </a>

                          <div className="flex-1 h-2 rounded bg-zinc-100 dark:bg-zinc-800">
                            <div
                              className="h-2 rounded bg-blue-600 dark:bg-blue-400"
                              style={{ width: `${Math.max(4, (count / maxNamespaceCount) * 100)}%` }}
                            />
                          </div>

                          <span className="text-sm font-medium w-12 text-right">{count}</span>

                          <button
                            className="ml-2 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            onClick={() => {
                              const nsNum = Number(ns);
                              const next = new Set(hiddenNamespaces);
                              if (next.has(nsNum)) next.delete(nsNum);
                              else next.add(nsNum);
                              setHiddenNamespaces(next);
                            }}
                            title={hiddenNamespaces.has(Number(ns)) ? "Unhide namespace" : "Hide namespace"}
                          >
                            <X className="w-4 h-4 text-zinc-500" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex-1 min-h-[300px]">
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={Object.entries(stats.namespaceTotals)
                              .filter(([ns]) => !hiddenNamespaces.has(Number(ns)))
                              .map(([ns, count]) => ({
                                name: namespacesMap[ns] || `NS ${ns}`,
                                value: count,
                              }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            dataKey="value"
                            label
                          >
                            {Object.entries(stats.namespaceTotals)
                              .filter(([ns]) => !hiddenNamespaces.has(Number(ns)))
                              .map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 mt-1">{`Based on last ${contribs.length} edits.`}</p>
                </>
              )}
            </div>
          )}

          {/* Year Counts */}
          {options.yearCounts && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <Link
                  href={
                    username
                      ? `/jptools/edit-counter?username=${encodeURIComponent(username)}&section=yearCounts`
                      : "#"
                  }
                  className="font-semibold hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Year Counts
                </Link>
              </div>

              {contribs.length === 0 ? (
                <div className="text-sm text-zinc-500">No contributions found in selected range.</div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 content-start">
                    {Object.entries(filteredYearCounts)
                      .sort((a, b) => Number(a[0]) - Number(b[0]))
                      .map(([year, count]) => (
                        <div key={year} className="p-3 rounded bg-zinc-50 dark:bg-zinc-800">
                          <div className="text-sm text-zinc-500">{year}</div>
                          <div className="text-lg font-semibold">{count}</div>
                        </div>
                      ))}
                  </div>

                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Object.entries(filteredYearCounts)
                          .sort((a, b) => Number(a[0]) - Number(b[0]))
                          .map(([year, count]) => ({ name: year, edits: count }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="edits" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Month Counts */}
          {options.monthCounts && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <Link
                  href={
                    username
                      ? `/jptools/edit-counter?username=${encodeURIComponent(username)}&section=monthCounts`
                      : "#"
                  }
                  className="font-semibold hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Month Counts
                </Link>
              </div>

              {contribs.length === 0 ? (
                <div className="text-sm text-zinc-500">No contributions found in selected range.</div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 grid grid-cols-3 md:grid-cols-4 gap-3 content-start">
                    {Object.entries(filteredMonthCounts)
                      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
                      .map(([month, count]) => (
                        <div key={month} className="p-3 rounded bg-zinc-50 dark:bg-zinc-800">
                          <div className="text-xs text-zinc-500">{month}</div>
                          <div className="text-base font-semibold">{count}</div>
                        </div>
                      ))}
                  </div>

                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Object.entries(filteredMonthCounts)
                          .sort((a, b) => (a[0] > b[0] ? 1 : -1))
                          .map(([month, count]) => ({ name: month, edits: count }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="edits" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top Edited Pages */}
          {options.topPages && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <BarChart2 className="w-5 h-5 text-yellow-600" />
                <Link
                  href={
                    username ? `/jptools/edit-counter?username=${encodeURIComponent(username)}&section=topPages` : "#"
                  }
                  className="font-semibold hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Top Edited Pages
                </Link>
              </div>

              {contribs.length === 0 ? (
                <div className="text-sm text-zinc-500">No contributions found in selected range.</div>
              ) : stats.topPages.length === 0 ? (
                <div className="text-sm text-zinc-500">No top pages found in selected range.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.topPages.map((page) => (
                    <div
                      key={page.title}
                      className="flex justify-between items-center p-3 rounded bg-zinc-50 dark:bg-zinc-800"
                    >
                      <a
                        href={`https://justapedia.org/wiki/${encodeURIComponent(page.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium truncate flex-1 pr-4 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                      >
                        {page.title}
                      </a>
                      <span className="text-zinc-500 font-mono">{page.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rights Changes */}
          {options.rightsChanges && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <Link
                  href={
                    username
                      ? `/jptools/edit-counter?username=${encodeURIComponent(username)}&section=rightsChanges`
                      : "#"
                  }
                  className="font-semibold hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Rights Changes
                </Link>
              </div>

              {stats.rightsChanges.length === 0 ? (
                <div className="text-sm text-zinc-500">No recent rights changes found.</div>
              ) : (
                <div className="space-y-2">
                  {stats.rightsChanges.map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {formatDateTime(e.timestamp)} {" · "} {e.comment || "Rights change"}
                      </span>
                      <span className="text-zinc-500">{e.user}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
