"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import axios from "axios";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  User,
  Settings,
  FileText,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

const TOOL_PATTERNS = [
  {
    id: "autowikibrowser",
    label: "AutoWikiBrowser",
    tagMatches: ["awb", "autowikibrowser"],
    commentMatches: ["awb", "autowikibrowser"],
  },
  {
    id: "huggle",
    label: "Huggle",
    tagMatches: ["huggle"],
    commentMatches: ["huggle"],
  },
  {
    id: "twinkle",
    label: "Twinkle",
    tagMatches: ["twinkle"],
    commentMatches: ["twinkle"],
  },
  {
    id: "hotcat",
    label: "HotCat",
    tagMatches: ["hotcat"],
    commentMatches: ["hotcat"],
  },
  {
    id: "visualeditor",
    label: "VisualEditor",
    tagMatches: ["visualeditor"],
    commentMatches: ["visualeditor"],
  },
  {
    id: "rollback",
    label: "Rollback",
    tagMatches: ["mw-rollback"],
    commentMatches: ["rollback"],
  },
  {
    id: "undo",
    label: "Undo",
    tagMatches: ["mw-undo"],
    commentMatches: ["undid revision", "undid edits", "reverted edits"],
  },
];

function detectTool(tags, comment) {
  const lowerTags = tags.map((t) => String(t).toLowerCase());
  const lowerComment = (comment || "").toLowerCase();

  for (const pattern of TOOL_PATTERNS) {
    const tagHit =
      pattern.tagMatches &&
      pattern.tagMatches.some((p) => lowerTags.some((t) => t.includes(p)));
    const commentHit =
      pattern.commentMatches &&
      pattern.commentMatches.some((p) => lowerComment.includes(p));
    if (tagHit || commentHit) {
      return { id: pattern.id, label: pattern.label };
    }
  }

  if (lowerTags.length > 0) {
    const rawTag = tags[0];
    return { id: `tag:${rawTag}`, label: rawTag };
  }

  return null;
}

function classifyEdits(rows) {
  const toolMeta = {};

  const edits = rows.map((c) => {
    const tags = Array.isArray(c.tags) ? c.tags : [];
    const tool = detectTool(tags, c.comment);
    const toolId = tool ? tool.id : null;
    const toolLabel = tool ? tool.label : null;
    if (toolId && !toolMeta[toolId]) {
      toolMeta[toolId] = toolLabel || toolId;
    }
    return {
      ...c,
      tags,
      toolId,
      toolLabel,
      isAutomated: !!toolId,
    };
  });

  const total = edits.length;
  const automated = edits.filter((e) => e.isAutomated).length;
  const nonAutomated = total - automated;

  const perTool = {};
  edits.forEach((e) => {
    if (e.toolId) {
      perTool[e.toolId] = (perTool[e.toolId] || 0) + 1;
    }
  });

  const toolOptions = Object.entries(toolMeta)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([id, label]) => ({ id, label }));

  return {
    edits,
    stats: { total, automated, nonAutomated, perTool },
    toolOptions,
  };
}

function PaginationControls({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="text-sm">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function AutomatedEdits() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-zinc-500">Loading tool...</div>}>
      <AutomatedEditsContent />
    </Suspense>
  );
}

function AutomatedEditsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [namespaceId, setNamespaceId] = useState("0");
  const [namespacesMap, setNamespacesMap] = useState({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [toolFilter, setToolFilter] = useState("none");
  const [summaryFilter, setSummaryFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [rawEdits, setRawEdits] = useState([]);
  const [classified, setClassified] = useState(null);
  const [toolOptions, setToolOptions] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

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
    } catch (e) {
      setNamespacesMap({ 0: "(Main)" });
    }
  };

  const parseMDY = (s) => {
    if (!s || typeof s !== "string") return null;
    const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const mm = parseInt(m[1], 10);
    const dd = parseInt(m[2], 10);
    const yyyy = parseInt(m[3], 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1970) return null;
    const d = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0));
    return d;
  };

  const toMwIso = (d, endOfDay) => {
    if (!d) return undefined;
    const dt = new Date(d);
    if (endOfDay) dt.setUTCHours(23, 59, 59, 0);
    return dt.toISOString().replace(/\.\d{3}Z$/, "Z");
  };

  const fetchEdits = useCallback(async (
    overrideUser, 
    overrideNs, 
    overrideStart, 
    overrideEnd,
    overrideTool, // Not used in fetch logic but useful for flow
    overrideSummary
  ) => {
    const user = (overrideUser !== undefined ? overrideUser : username).trim();
    if (!user) return;

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("username", user);
    
    const nsVal = overrideNs !== undefined ? overrideNs : namespaceId;
    if (nsVal !== "0") params.set("namespace", nsVal); else params.delete("namespace");
    
    const startVal = overrideStart !== undefined ? overrideStart : startDate;
    if (startVal) params.set("start", startVal); else params.delete("start");
    
    const endVal = overrideEnd !== undefined ? overrideEnd : endDate;
    if (endVal) params.set("end", endVal); else params.delete("end");
    
    const toolVal = overrideTool !== undefined ? overrideTool : toolFilter;
    if (toolVal !== "none") params.set("tool", toolVal); else params.delete("tool");

    const summaryVal = overrideSummary !== undefined ? overrideSummary : summaryFilter;
    if (summaryVal) params.set("summary", summaryVal); else params.delete("summary");

    const newSearchString = params.toString();
    if (newSearchString !== searchParams.toString()) {
      router.replace(`${pathname}?${newSearchString}`);
    }

    const nsFilter = nsVal === "" ? undefined : Number(nsVal);
    const sd = parseMDY(startVal);
    const ed = parseMDY(endVal);
    const ucstart = ed ? toMwIso(ed, true) : undefined;
    const ucend = sd ? toMwIso(sd, false) : undefined;

    setLoading(true);
    setError("");
    setRawEdits([]);
    setClassified(null);
    setToolOptions([]);
    setCurrentPage(1);

    try {
      let uccontinue = undefined;
      const results = [];
      while (results.length < 5000) {
        const params = {
          action: "query",
          list: "usercontribs",
          ucuser: user,
          ucprop: "ids|title|timestamp|comment|size|tags|flags|ns",
          uclimit: Math.min(500, 5000 - results.length),
          format: "json",
          // origin: "*",
        };
        if (nsFilter !== undefined) params.ucnamespace = nsFilter;
        if (ucstart) params.ucstart = ucstart;
        if (ucend) params.ucend = ucend;
        if (uccontinue) params.uccontinue = uccontinue;

        const res = await axios.get("/api/justapedia", { params });
        if (res.data.error) {
          throw new Error(res.data.error.info || "API Error");
        }
        const chunk = res.data?.query?.usercontribs || [];
        results.push(...chunk);
        const cont = res.data?.continue?.uccontinue;
        if (!cont) break;
        uccontinue = cont;
      }

      setRawEdits(results);
      const result = classifyEdits(results);
      setClassified(result);
      setToolOptions(result.toolOptions);
    } catch (err) {
      setError(err.message || "Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [username, namespaceId, startDate, endDate, toolFilter, summaryFilter, searchParams, pathname, router]);

  useEffect(() => {
    fetchNamespaces();

    const userParam = searchParams.get("username");
    if (userParam) {
      const nsParam = searchParams.get("namespace") || "0";
      const startParam = searchParams.get("start") || "";
      const endParam = searchParams.get("end") || "";
      const toolParam = searchParams.get("tool") || "none";
      const summaryParam = searchParams.get("summary") || "";
      
      setUsername(userParam);
      if (nsParam) setNamespaceId(nsParam);
      if (startParam) setStartDate(startParam);
      if (endParam) setEndDate(endParam);
      if (toolParam) setToolFilter(toolParam);
      if (summaryParam) setSummaryFilter(summaryParam);
    }
  }, [searchParams]);

  const filteredEdits = useMemo(() => {
    if (!classified) return [];
    let edits = classified.edits;

    if (toolFilter === "none") {
      edits = edits.filter((e) => !e.isAutomated);
    } else if (toolFilter === "all") {
      edits = edits.filter((e) => e.isAutomated);
    } else {
      edits = edits.filter((e) => e.toolId === toolFilter);
    }

    if (summaryFilter) {
      const lower = summaryFilter.toLowerCase();
      edits = edits.filter((e) => (e.comment || "").toLowerCase().includes(lower));
    }

    return edits;
  }, [classified, toolFilter, summaryFilter]);

  const filteredStats = useMemo(() => {
    const total = filteredEdits.length;
    const automated = filteredEdits.filter((e) => e.isAutomated).length;
    const nonAutomated = filteredEdits.filter((e) => !e.isAutomated).length;
    return { total, automated, nonAutomated };
  }, [filteredEdits]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredEdits.length / pageSize)),
    [filteredEdits.length]
  );

  const pagedEdits = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredEdits.slice(start, start + pageSize);
  }, [filteredEdits, currentPage, totalPages]);

  const currentNamespaceLabel =
    namespaceId === ""
      ? "All namespaces"
      : namespacesMap[Number(namespaceId)] || `NS ${namespaceId}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
        <Settings className="w-8 h-8 text-indigo-600" /> Automated Edits
      </h1>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="text-sm text-zinc-600 dark:text-zinc-300 space-y-1">
          <p>
            The Automated Edits tool analyzes edits a user made using
            semi-automated or fully-automated tools. It can also list
            non-automated edits.
          </p>
          <p>
            It is primarily designed to surface mainspace edits that are prose
            and content, rather than mechanical fixes. For this reason, the
            default namespace is the mainspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <User className="absolute left-3 top-3.5 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="User"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-indigo-600 outline-none"
              onKeyDown={(e) => e.key === "Enter" && fetchEdits()}
            />
          </div>

          <div>
            <select
              value={namespaceId}
              onChange={(e) => setNamespaceId(e.target.value)}
              className="w-full pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-indigo-600 outline-none"
            >
              <option value="0">Main namespace</option>
              <option value="">All namespaces</option>
              {Object.entries(namespacesMap)
                .filter(([id]) => id !== "0")
                .map(([id, name]) => (
                  <option key={id} value={id}>
                    {name} (NS {id})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <select
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
              className="w-full pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-indigo-600 outline-none"
            >
              <option value="none">None (non-automated edits)</option>
              <option value="all">All (automated edits only)</option>
              {toolOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <input
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Starting date (Optional) mm/dd/yyyy"
              className="w-full pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div className="relative">
            <input
              type="text"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Ending date (Optional) mm/dd/yyyy"
              className="w-full pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div className="relative">
            <input
              type="text"
              value={summaryFilter}
              onChange={(e) => setSummaryFilter(e.target.value)}
              placeholder="Summary/Comment filter"
              className="w-full pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div>
            <button
              onClick={() => fetchEdits()}
              disabled={loading}
              className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              {loading ? "Loading..." : "Analyze"}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}
      </div>

      {classified && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-indigo-600" />
              <div className="font-semibold">Summary</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800">
                <div className="text-zinc-500 mb-1">User</div>
                <div className="font-semibold break-all">{username.trim()}</div>
              </div>
              <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800">
                <div className="text-zinc-500 mb-1">Namespace</div>
                <div className="font-semibold">{currentNamespaceLabel}</div>
              </div>
              <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800">
                <div className="text-zinc-500 mb-1">Tool filter</div>
                <div className="font-semibold">
                  {toolFilter === "none"
                    ? "None (non-automated)"
                    : toolFilter === "all"
                    ? "All automated tools"
                    : toolOptions.find((t) => t.id === toolFilter)?.label ||
                      toolFilter}
                </div>
              </div>
              <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800">
                <div className="text-zinc-500 mb-1">Summary filter</div>
                <div className="font-semibold">
                  {summaryFilter || "None"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-sm">
              <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800">
                <div className="text-zinc-500 mb-1">Edits in view</div>
                <div className="font-semibold">
                  {filteredStats.total.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800">
                <div className="text-zinc-500 mb-1">Automated edits</div>
                <div className="font-semibold">
                  {filteredStats.automated.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800">
                <div className="text-zinc-500 mb-1">Non-automated edits</div>
                <div className="font-semibold">
                  {filteredStats.nonAutomated.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800">
                <div className="text-zinc-500 mb-1">Total fetched</div>
                <div className="font-semibold">
                  {classified.stats.total.toLocaleString()}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Tool detection is heuristic and based on edit tags and summaries.
              Selecting “None” shows edits where no automation tool was
              detected. Selecting “All” shows edits where some tool was
              detected. Choosing a specific tool shows only edits attributed to
              that tool.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-indigo-600" />
              <div className="font-semibold">Edits</div>
            </div>

            {filteredEdits.length === 0 && (
              <div className="text-sm text-zinc-500">
                No edits matched the current filters.
              </div>
            )}

            {filteredEdits.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-zinc-500 bg-zinc-50 dark:bg-zinc-800">
                        <th className="p-2 rounded-l-lg">Time</th>
                        <th className="p-2">Page</th>
                        <th className="p-2">Tool</th>
                        <th className="p-2 rounded-r-lg">Edit summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedEdits.map((e) => (
                        <tr
                          key={e.revid}
                          className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                        >
                          <td className="p-2 whitespace-nowrap">
                            {new Date(e.timestamp).toLocaleString()}
                          </td>
                          <td className="p-2">
                            <a
                              href={`https://justapedia.org/wiki/${encodeURIComponent(
                                e.title
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              {e.title}
                              <ArrowUpRight className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="p-2">
                            {e.toolLabel || "None (non-automated)"}
                          </td>
                          <td className="p-2 text-xs text-zinc-600 dark:text-zinc-300">
                            {e.comment || "No summary"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
