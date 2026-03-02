"use client";

import { useState, useMemo, useEffect, Suspense, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import axios from "axios";
import { FileText, Search, Clock, User, BarChart2, Link as LinkIcon, PieChart, AlertCircle, Layers, BookOpen, PenTool } from "lucide-react";
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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ff7300", "#d0ed57"];

const fetchAllRevisions = async (pageTitle) => {
  let allRevs = [];
  let rvcontinue = null;
  let count = 0;
  const MAX_REVS = 5000; // Limit to prevent browser crash

  while (count < MAX_REVS) {
    const params = {
      action: "query",
      prop: "revisions",
      titles: pageTitle,
      rvprop: "ids|timestamp|user|size|tags|comment|flags",
      rvlimit: "max",
      format: "json",
      // origin: "*"
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
  
  // Sort by timestamp descending (newest first) just in case
  return allRevs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const analyzeRevisions = (revs) => {
  if (!revs || revs.length === 0) {
    return {
      totalEdits: 0,
      editors: 0,
      minorCount: 0,
      anonCount: 0,
      botCount: 0,
      revertedCount: 0,
      firstEdit: { timestamp: new Date().toISOString(), user: "N/A" },
      latestEdit: { timestamp: new Date().toISOString(), user: "N/A" },
      maxAdded: { size: 0, rev: null },
      maxDeleted: { size: 0, rev: null },
      daysPerEdit: 0,
      yearCounts: {},
      topEditors: [],
      authorship: [],
    };
  }

  const editors = new Set();
  const userCounts = {};
  const userAddedBytes = {};
  const yearCounts = {};
  
  let minorCount = 0;
  let anonCount = 0; // Unregistered
  let botCount = 0; // Approximation via flags or name
  let revertedCount = 0;
  let maxAdded = { size: 0, rev: null };
  let maxDeleted = { size: 0, rev: null };

  // We need to calculate size diffs. Since revs are Newest -> Oldest:
  // Diff for rev[i] = rev[i].size - rev[i+1].size
  // For the oldest rev (last one), Diff = rev[last].size - 0 (created)

  const reversedRevs = [...revs].reverse(); // Oldest -> Newest for easy diff calc

  reversedRevs.forEach((rev, i) => {
    const prevSize = i > 0 ? (reversedRevs[i - 1].size || 0) : 0;
    const diff = (rev.size || 0) - prevSize;
    
    // Stats
    editors.add(rev.user);
    userCounts[rev.user] = (userCounts[rev.user] || 0) + 1;
    
    if (diff > 0) {
      userAddedBytes[rev.user] = (userAddedBytes[rev.user] || 0) + diff;
    }

    if (diff > maxAdded.size) maxAdded = { size: diff, rev };
    if (diff < maxDeleted.size) maxDeleted = { size: diff, rev }; // diff is negative
    
    if (rev.minor !== undefined) minorCount++;
    // Check for anon (IPs usually don't have user ID or check format)
    // Justapedia API 'anon' property might be missing, checking user format
    if (isIP(rev.user) || rev.anon !== undefined) anonCount++;
    
    // Bot check (flag 'bot' or 'b' in tags?)
    // API returns 'minor' as property. 'bot' might be a property if fetched.
    // We didn't fetch 'flags' properly in rvprop? yes we did "flags".
    // Justapedia might return "bot" boolean.
    // Let's check tags for now.
    if (rev.tags?.some(t => t.includes("bot")) || rev.user.toLowerCase().includes("bot")) botCount++;
    
    // Reverted
    if (rev.tags?.some(t => t.includes("rollback") || t.includes("undo")) || rev.comment?.toLowerCase().includes("revert")) revertedCount++;

    // Time stats
    const d = new Date(rev.timestamp);
    const year = d.getUTCFullYear();
    yearCounts[year] = (yearCounts[year] || 0) + 1;
  });

  // Top Editors
  const topEditors = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([user, count]) => ({ user, count }));

  // Authorship (Added Bytes)
  const authorship = Object.entries(userAddedBytes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([user, bytes]) => ({ user, bytes }));

  // Averages
  const msPerEdit = revs.length > 1 
    ? (new Date(revs[0].timestamp) - new Date(revs[revs.length - 1].timestamp)) / (revs.length - 1)
    : 0;
  const daysPerEdit = msPerEdit / (1000 * 60 * 60 * 24);

  return {
    totalEdits: revs.length,
    editors: editors.size,
    minorCount,
    anonCount,
    botCount,
    revertedCount,
    firstEdit: reversedRevs[0],
    latestEdit: revs[0],
    maxAdded,
    maxDeleted,
    daysPerEdit,
    yearCounts,
    topEditors,
    authorship,
  };
};

const analyzeProse = (html) => {
  if (typeof window === "undefined") return { bytes: 0, words: 0, chars: 0 };
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const text = doc.body.textContent || "";
  const words = text.trim().split(/\s+/).length;
  
  return {
    bytes: new Blob([text]).size,
    chars: text.length,
    words: words,
    references: doc.querySelectorAll(".reference, sup.reference").length, // heuristic
  };
};

const isIP = (user) => {
  // Simple regex for IPv4/IPv6
  return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(user) || user.includes(":");
};

export default function PageInfo() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-zinc-500">Loading tool...</div>}>
      <PageInfoContent />
    </Suspense>
  );
}

function PageInfoContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const fetchPageInfo = useCallback(async (overrideTitle) => {
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
    setAnalysis(null);

    try {
      // 1. Basic Info & Content (Parse)
      const parseReq = axios.get("/api/justapedia", {
        params: {
          action: "parse",
          page: t,
          prop: "text|sections|templates|categories|links|images|externallinks|displaytitle|revid",
          redirects: 1, // Follow redirects
          format: "json",
          // origin: "*",
        },
      });

      // 2. Info (Protection, Watchers, etc.)
      const infoReq = axios.get("/api/justapedia", {
        params: {
          action: "query",
          prop: "info|pageviews",
          titles: t,
          redirects: 1, // Follow redirects
          inprop: "protection|watchers|visitingwatchers|notificationtimestamp|subjectid|url|talkid",
          format: "json",
          // origin: "*",
        },
      });

      // 3. Backlinks (Links to this page)
      const backlinksReq = axios.get("/api/justapedia", {
        params: {
          action: "query",
          list: "backlinks",
          bltitle: t,
          redirects: 1, // Follow redirects
          bllimit: "max",
          format: "json",
          // origin: "*",
        },
      });

      const [parseRes, infoRes, blRes] = await Promise.all([parseReq, infoReq, backlinksReq]);

      if (parseRes.data.error) throw new Error(parseRes.data.error.info);
      
      // Get the page info. With redirects=1, 'pages' contains the target.
      // If multiple pages (unlikely with single title), we want the one that isn't missing, or the last one?
      // Usually query returns the resolved page in 'pages'.
      const pages = infoRes.data?.query?.pages || {};
      const pageInfo = Object.values(pages)[0];
      const parseData = parseRes.data?.parse;
      const backlinks = blRes.data?.query?.backlinks || [];

      // Robust check for existence
      const isMissing = !pageInfo || pageInfo.missing !== undefined;
      // If parse succeeded (has pageid), we trust it even if info query is weird.
      if (isMissing && !parseData?.pageid) {
        throw new Error("Page not found.");
      }

      // Use the canonical title from parse (handles redirects)
      const canonicalTitle = parseData?.title || t;

      // 4. Fetch Revisions (Batched)
      const revisions = await fetchAllRevisions(canonicalTitle);
      
      // 5. Fetch Assessment (Talk page categories)
      let assessment = "Unknown";
      if (pageInfo?.talkid) {
        try {
          const talkRes = await axios.get("/api/justapedia", {
            params: {
              action: "parse",
              pageid: pageInfo.talkid,
              prop: "categories",
              format: "json",
              // origin: "*",
            },
          });
          const cats = talkRes.data?.parse?.categories || [];
          // Simple heuristic for assessment
          const classCat = cats.find(c => c["*"].includes("-class_articles"));
          if (classCat) {
            assessment = classCat["*"].replace(/_articles$/, "").replace(/-/g, " ");
          }
        } catch (e) {
          console.warn("Failed to fetch assessment", e);
        }
      }

      // Process Data
      const processedStats = analyzeRevisions(revisions);
      const proseStats = analyzeProse(parseData?.text?.["*"] || "");

      setData({
        ...pageInfo,
        title: parseData?.title || t, // Display title
        length: pageInfo?.length || revisions?.[0]?.size || 0,
        pageid: pageInfo?.pageid || parseData?.pageid,
        revisions,
        backlinksCount: backlinks.length,
        assessment,
        parse: parseData,
      });

      setAnalysis({
        ...processedStats,
        prose: proseStats,
      });

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch page info.");
    } finally {
      setLoading(false);
    }
  }, [title, searchParams, pathname, router]);

  useEffect(() => {
    const t = searchParams.get("title");
    if (t) {
      setTitle(t);
      fetchPageInfo(t);
    }
  }, [searchParams, fetchPageInfo]);





  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
        <FileText className="w-8 h-8 text-green-600" /> Page Info
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
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-green-500 outline-none"
              onKeyDown={(e) => e.key === "Enter" && fetchPageInfo()}
            />
          </div>
          <button
            onClick={fetchPageInfo}
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Get Info"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {data && analysis && (
        <div className="space-y-6">
          {/* General Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label="Page Size" value={`${data.length?.toLocaleString()} bytes`} icon={<FileText className="text-blue-500" />} />
            <Card label="Total Edits" value={analysis.totalEdits.toLocaleString()} icon={<PenTool className="text-green-500" />} />
            <Card label="Editors" value={analysis.editors.toLocaleString()} icon={<User className="text-purple-500" />} />
            <Card label="Assessment" value={data.assessment} icon={<Layers className="text-orange-500" />} />
            <Card label="Pageviews (30d)" value={data.pageviews ? Object.values(data.pageviews).reduce((a, b) => a + (b || 0), 0).toLocaleString() : "N/A"} icon={<BookOpen className="text-teal-500" />} />
            <Card label="Minor Edits" value={`${analysis.minorCount} (${((analysis.minorCount / analysis.totalEdits) * 100).toFixed(1)}%)`} />
            <Card label="Unregistered" value={`${analysis.anonCount} (${((analysis.anonCount / analysis.totalEdits) * 100).toFixed(1)}%)`} />
            <Card label="Bot Edits" value={`${analysis.botCount} (${((analysis.botCount / analysis.totalEdits) * 100).toFixed(1)}%)`} />
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold mb-4 text-lg">History Highlights</h3>
              <div className="space-y-4 text-sm">
                <Row label="First Edit" value={
                  <div className="flex items-center gap-1">
                    <span>{new Date(analysis.firstEdit.timestamp).toLocaleDateString()} • </span>
                    <a href={`https://justapedia.org/wiki/User:${encodeURIComponent(analysis.firstEdit.user)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{analysis.firstEdit.user}</a>
                  </div>
                } />
                <Row label="Latest Edit" value={
                  <div className="flex items-center gap-1">
                    <span>{new Date(analysis.latestEdit.timestamp).toLocaleDateString()} • </span>
                    <a href={`https://justapedia.org/wiki/User:${encodeURIComponent(analysis.latestEdit.user)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{analysis.latestEdit.user}</a>
                  </div>
                } />
                <Row label="Max Added" value={
                  analysis.maxAdded.rev ? (
                    <div className="flex items-center gap-1">
                      <span>{new Date(analysis.maxAdded.rev.timestamp).toLocaleDateString()} • </span>
                      <a href={`https://justapedia.org/wiki/User:${encodeURIComponent(analysis.maxAdded.rev.user)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{analysis.maxAdded.rev.user}</a>
                      <span> • </span>
                      <a href={`https://justapedia.org/wiki/index.php?title=${encodeURIComponent(data.title)}&diff=${analysis.maxAdded.rev.revid}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">+{analysis.maxAdded.size}</a>
                    </div>
                  ) : "-"
                } />
                <Row label="Max Deleted" value={
                  analysis.maxDeleted.rev ? (
                    <div className="flex items-center gap-1">
                      <span>{new Date(analysis.maxDeleted.rev.timestamp).toLocaleDateString()} • </span>
                      <a href={`https://justapedia.org/wiki/User:${encodeURIComponent(analysis.maxDeleted.rev.user)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{analysis.maxDeleted.rev.user}</a>
                      <span> • </span>
                      <a href={`https://justapedia.org/wiki/index.php?title=${encodeURIComponent(data.title)}&diff=${analysis.maxDeleted.rev.revid}`} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">{analysis.maxDeleted.size}</a>
                    </div>
                  ) : "-"
                } />
                <Row label="Avg Time Between Edits" value={`${analysis.daysPerEdit.toFixed(1)} days`} />
                <Row label="Avg Edits/User" value={(analysis.totalEdits / analysis.editors).toFixed(1)} />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold mb-4 text-lg">Content & Links</h3>
              <div className="space-y-4 text-sm">
                <Row label="Links to this page" value={data.backlinksCount.toLocaleString()} />
                <Row label="External Links" value={data.parse.externallinks?.length.toLocaleString() || 0} />
                <Row label="Categories" value={data.parse.categories?.length.toLocaleString() || 0} />
                <Row label="Files/Images" value={data.parse.images?.length.toLocaleString() || 0} />
                <Row label="Templates" value={data.parse.templates?.length.toLocaleString() || 0} />
                <div className="border-t pt-4 mt-4 dark:border-zinc-800">
                  <h4 className="font-semibold mb-2">Prose (Approx.)</h4>
                  <Row label="Bytes" value={analysis.prose.bytes.toLocaleString()} />
                  <Row label="Words" value={analysis.prose.words.toLocaleString()} />
                  <Row label="Characters" value={analysis.prose.chars.toLocaleString()} />
                  <Row label="References" value={analysis.prose.references.toLocaleString()} />
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 min-h-[400px]">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-500" /> Year Counts
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(analysis.yearCounts).map(([k, v]) => ({ name: k, count: v }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" name="Edits" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 min-h-[400px]">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-500" /> Top Editors (by Edits)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart layout="vertical" data={analysis.topEditors} margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="user" type="category" width={100} tick={{fontSize: 12}} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" name="Edits" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
           {/* Authorship Attribution */}
           <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 min-h-[400px]">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-orange-500" /> Authorship
              </h3>
              


              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={analysis.authorship}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="bytes"
                    nameKey="user"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {analysis.authorship.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index < 10 ? COLORS[index % COLORS.length] : "#9ca3af"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value.toLocaleString() + " characters"} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

        </div>
      )}
    </div>
  );
}

function Card({ label, value, icon }) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold text-zinc-900 dark:text-white">{value}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="font-medium text-zinc-900 dark:text-zinc-200">{value}</span>
    </div>
  );
}
