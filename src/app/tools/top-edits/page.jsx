"use client";

import { useEffect, useMemo, useState, Suspense, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import axios from "axios";
import { Search, User, FileText, ArrowUpRight, ListOrdered, Info, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

function PaginationControls({ currentPage, totalPages, onPageChange }) {
// ... existing code ...
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

function NamespaceTable({ group, namespacesMap, assessments, openDetail }) {
// ... existing code ...
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(group.pages.length / pageSize);
  
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return group.pages.slice(start, start + pageSize);
  }, [group.pages, currentPage]);

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold">
          Namespace: {namespacesMap[group.ns] || `NS ${group.ns}`} (NS {group.ns})
        </div>
        <div className="text-sm text-zinc-500">
          Pages: {group.pages.length.toLocaleString()}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 bg-zinc-50 dark:bg-zinc-800">
              <th className="p-2 rounded-l-lg">Page</th>
              <th className="p-2">Edits</th>
              <th className="p-2">Assessment</th>
              <th className="p-2 rounded-r-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((p) => (
              <tr
                key={`${group.ns}-${p.title}`}
                className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
              >
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://justapedia.org/wiki/${encodeURIComponent(p.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {p.title}
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                </td>
                <td className="p-2 font-mono">{p.count}</td>
                <td className="p-2">
                  {assessments[p.title] ? assessments[p.title] : "—"}
                </td>
                <td className="p-2">
                  <button
                    className="px-3 py-1 rounded bg-teal-600 text-white hover:bg-teal-700"
                    onClick={() => openDetail(p.title, group.ns)}
                  >
                    Top Edits
                  </button>
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
    </div>
  );
}

function EditsList({ edits, pageTitle }) {
// ... existing code ...
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(edits.length / pageSize);

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return edits.slice(start, start + pageSize);
  }, [edits, currentPage]);

  if (edits.length === 0) {
    return (
      <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-500">
        No edits found for this page by the specified user in the selected range.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {currentItems.map((e) => {
        const prevId = e.parentid || undefined;
        const diffLink =
          prevId !== undefined
            ? `https://justapedia.org/w/index.php?title=${encodeURIComponent(
                pageTitle
              )}&diff=${e.revid}&oldid=${prevId}`
            : undefined;
        return (
          <div
            key={e.revid}
            className={`p-3 rounded border ${
              e.reverted
                ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
                : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                {new Date(e.timestamp).toLocaleString()}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-mono">
                  {typeof e.diff === "number" ? (e.diff > 0 ? `+${e.diff}` : `${e.diff}`) : "—"}
                </div>
                {diffLink && (
                  <a
                    href={diffLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Diff <ArrowUpRight className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="text-xs text-zinc-500 mt-1">{e.comment || "No summary"}</div>
          </div>
        );
      })}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

export default function TopEdits() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-zinc-500">Loading tool...</div>}>
      <TopEditsContent />
    </Suspense>
  );
}

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

function TopEditsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [namespaceId, setNamespaceId] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [namespacesMap, setNamespacesMap] = useState({});
  const [contribs, setContribs] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [assessments, setAssessments] = useState({});

  const [detailPage, setDetailPage] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const fetchAssessments = useCallback(async (titles) => {
    if (!titles || titles.length === 0) return;

    // Chunk titles to avoid API limits
    const chunks = [];
    for (let i = 0; i < titles.length; i += 50) {
      chunks.push(titles.slice(i, i + 50));
    }

    const newAssessments = {};

    for (const chunk of chunks) {
      try {
        // Step 1: Get talk page IDs
        const infoRes = await axios.get("/api/justapedia", {
          params: {
            action: "query",
            prop: "info",
            inprop: "talkid",
            titles: chunk.join("|"),
            format: "json",
            // origin: "*",
          },
        });

        const pages = infoRes.data?.query?.pages || {};
        const talkIds = [];
        const talkIdToTitle = {};

        Object.values(pages).forEach((p) => {
          if (p.talkid) {
            talkIds.push(p.talkid);
            talkIdToTitle[p.talkid] = p.title;
          }
        });

        if (talkIds.length === 0) continue;

        // Step 2: Get categories for talk pages
        const talkChunks = [];
        for (let i = 0; i < talkIds.length; i += 50) {
          talkChunks.push(talkIds.slice(i, i + 50));
        }

        for (const tChunk of talkChunks) {
          const catRes = await axios.get("/api/justapedia", {
            params: {
              action: "query",
              prop: "categories",
              pageids: tChunk.join("|"),
              cllimit: "max",
              format: "json",
              // origin: "*",
            },
          });

          const catPages = catRes.data?.query?.pages || {};
          Object.values(catPages).forEach((cp) => {
            const articleTitle = talkIdToTitle[cp.pageid];
            if (!articleTitle) return;

            const cats = cp.categories || [];
            // Look for categories like "Category:Start-Class articles"
            const classCat = cats.find((c) =>
              c.title.match(/Category:.+-Class[ _]articles/i)
            );

            if (classCat) {
              const match = classCat.title.match(/Category:(.+?)-Class[ _]articles/i);
              if (match) {
                newAssessments[articleTitle] = match[1];
              }
            }
          });
        }
      } catch (e) {
        console.error("Failed to fetch assessments", e);
      }
    }

    setAssessments((prev) => ({ ...prev, ...newAssessments }));
  }, []);

  const fetchContribs = useCallback(async (
    overrideUser,
    overrideNs,
    overridePage,
    overrideStart,
    overrideEnd
  ) => {
    const user = (overrideUser !== undefined ? overrideUser : username).trim();
    if (!user) return;

    const nsVal = overrideNs !== undefined ? overrideNs : namespaceId;
    const pageVal = overridePage !== undefined ? overridePage : pageTitle;
    const startVal = overrideStart !== undefined ? overrideStart : startDate;
    const endVal = overrideEnd !== undefined ? overrideEnd : endDate;

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("username", user);
    if (nsVal) params.set("namespace", nsVal); else params.delete("namespace");
    if (pageVal) params.set("page", pageVal); else params.delete("page");
    if (startVal) params.set("start", startVal); else params.delete("start");
    if (endVal) params.set("end", endVal); else params.delete("end");
    
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
    setContribs([]);
    setGrouped({});
    setAssessments({});

    try {
      let uccontinue = undefined;
      const results = [];
      while (results.length < 5000) {
        const params = {
          action: "query",
          list: "usercontribs",
          ucuser: user,
          ucprop: "ids|title|timestamp|comment|size|tags|flags|parsedcomment|sha1|ids|ns",
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
      const filtered = pageVal.trim()
        ? results.filter((c) => c.title === pageVal.trim())
        : results;
      setContribs(filtered);
      const groupedData = {};
      filtered.forEach((c) => {
        const ns = c.ns ?? 0;
        const key = `${ns}`;
        if (!groupedData[key]) {
            groupedData[key] = { ns, pages: {}, count: 0 };
        }
        groupedData[key].count++;
        if (!groupedData[key].pages[c.title]) {
            groupedData[key].pages[c.title] = { title: c.title, count: 0 };
        }
        groupedData[key].pages[c.title].count++;
      });
      
      const processed = {};
      Object.keys(groupedData).forEach(ns => {
        const arr = Object.values(groupedData[ns].pages).sort((a,b) => b.count - a.count);
        processed[ns] = {
            ns,
            count: groupedData[ns].count,
            pages: arr
        };
      });
      setGrouped(processed);

      // Fetch assessments for top pages
      const allTopPages = [];
      Object.values(processed).forEach(g => {
        allTopPages.push(...g.pages.slice(0, 50).map(p => p.title));
      });
      if (allTopPages.length > 0) {
        fetchAssessments(allTopPages);
      }

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [username, namespaceId, pageTitle, startDate, endDate, searchParams, pathname, router, fetchAssessments]);

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

  useEffect(() => {
    fetchNamespaces();

    const u = searchParams.get("username");
    const ns = searchParams.get("namespace");
    const pt = searchParams.get("page");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (u) {
      setUsername(u);
      if (ns) setNamespaceId(ns);
      if (pt) setPageTitle(pt);
      if (start) setStartDate(start);
      if (end) setEndDate(end);
    }
  }, [searchParams]);

  const openDetail = async (title, ns) => {
    if (!username.trim()) return;
    setDetailPage({ title, ns });
    setDetailLoading(true);
    setDetailError("");
    setDetailData(null);

    try {
      const sd = parseMDY(startDate);
      const ed = parseMDY(endDate);
      const rvstart = sd ? toMwIso(sd, false) : undefined;
      const rvend = ed ? toMwIso(ed, true) : undefined;

      let rvcontinue = undefined;
      const revs = [];
      while (revs.length < 2000) {
        const params = {
          action: "query",
          prop: "revisions",
          titles: title,
          rvprop: "ids|timestamp|user|size|comment|tags",
          rvlimit: Math.min(500, 2000 - revs.length),
          rvdir: "newer",
        };
        if (rvstart) params.rvstart = rvstart;
        if (rvend) params.rvend = rvend;
        if (rvcontinue) params.rvcontinue = rvcontinue;
        const res = await axios.get("/api/justapedia", {
          params: {
            ...params,
            format: "json",
            // origin: "*",
          },
        });
        const pages = res.data?.query?.pages || {};
        const pid = Object.keys(pages)[0];
        const chunk = pages[pid]?.revisions || [];
        revs.push(...chunk);
        const cont = res.data?.continue?.rvcontinue;
        if (!cont) break;
        rvcontinue = cont;
      }
      const withPrevSize = revs.map((rev, i) => {
        const prev = i > 0 ? revs[i - 1] : null;
        const next = i < revs.length - 1 ? revs[i + 1] : null;
        const prevSize = prev ? prev.size || 0 : undefined;
        const diff = prevSize !== undefined ? (rev.size || 0) - prevSize : undefined;
        let reverted = false;
        if (diff !== undefined && next && prev) {
          const nextSize = next.size || 0;
          if (nextSize === prevSize) {
            reverted = true;
          }
        }
        return { ...rev, prevSize, diff, reverted };
      });
      const userEdits = withPrevSize.filter((r) => r.user === username.trim());
      const addedApprox = userEdits
        .filter((r) => typeof r.diff === "number" && r.diff > 0 && !r.reverted)
        .reduce((a, b) => a + b.diff, 0);
      const revertedCount = userEdits.filter((r) => r.reverted).length;

      setDetailData({
        page: title,
        ns,
        totalEdits: userEdits.length,
        addedApprox,
        revertedCount,
        edits: userEdits,
      });
    } catch (e) {
      setDetailError(e.message || "Failed to fetch page edits.");
    } finally {
      setDetailLoading(false);
    }
  };

  const groupedNamespaces = useMemo(() => {
    return Object.keys(grouped)
      .map((ns) => {
        // Since we changed the structure of grouped[ns] to { ns, count, pages: [...] }
        // We need to adapt this map.
        // Actually, 'grouped' state now holds the processed structure directly:
        // { nsId: { ns, count, pages: [ {title, count}, ... ] } }
        // So we just need to return the values sorted by NS.
        return grouped[ns];
      })
      .sort((a, b) => a.ns - b.ns);
  }, [grouped]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {!detailPage && (
        <>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <ListOrdered className="w-8 h-8 text-teal-600" /> Top Edits
          </h1>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="User"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-teal-600 outline-none"
                  onKeyDown={(e) => e.key === "Enter" && fetchContribs()}
                />
              </div>
              <div>
                <select
                  value={namespaceId}
                  onChange={(e) => setNamespaceId(e.target.value)}
                  className="w-full pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-teal-600 outline-none"
                >
                  <option value="">All Namespaces</option>
                  {Object.entries(namespacesMap).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name} (NS {id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <FileText className="absolute left-3 top-3.5 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  placeholder="Page title (Optional)"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Starting date (Optional) mm/dd/yyyy"
                  className="w-full pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Ending date (Optional) mm/dd/yyyy"
                  className="w-full pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>
              <div>
                <button
                  onClick={() => fetchContribs()}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  {loading ? "Loading..." : "Analyze"}
                </button>
              </div>
            </div>
            {error && (
              <div className="p-3 rounded bg-red-50 text-red-600 border border-red-200">{error}</div>
            )}
          </div>

          {Object.keys(grouped).length > 0 && (
            <div className="space-y-6">
              {groupedNamespaces.map((group) => (
                <NamespaceTable
                  key={group.ns}
                  group={group}
                  namespacesMap={namespacesMap}
                  assessments={assessments}
                  openDetail={openDetail}
                />
              ))}
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-blue-600" />
              <div className="font-semibold">Opting in to restricted statistics</div>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-300 space-y-2">
              <p>Some statistics are considered private by some users.</p>
              <p>The affected tools are as follows:</p>
              <ul className="list-disc pl-6">
                <li>Edit Counter: Monthly counts bar chart; Timecard punch chart</li>
                <li>Top Edits: Top edits per namespace</li>
              </ul>
            </div>
          </div>
        </>
      )}

      {detailPage && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-2"
              onClick={() => {
                setDetailPage(null);
                setDetailData(null);
                setDetailError("");
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-teal-600" />
            Top edits to an article
          </h2>

          {detailLoading && (
            <div className="p-3 rounded bg-zinc-100 dark:bg-zinc-800">Loading page edits…</div>
          )}
          {detailError && (
            <div className="p-3 rounded bg-red-50 text-red-600 border border-red-200">{detailError}</div>
          )}

          {detailData && (
            <>
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className="text-zinc-500 mb-1">Article</div>
                    <div className="font-bold">{detailData.page}</div>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className="text-zinc-500 mb-1">Total edits</div>
                    <div className="font-bold">{detailData.totalEdits.toLocaleString()}</div>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className="text-zinc-500 mb-1">Added text (approx.)</div>
                    <div className="font-bold">{detailData.addedApprox.toLocaleString()}</div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  Reverted edits are only those reverted by the immediately following edit.
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-teal-600" />
                  <div className="font-semibold">
                    Edits by {username.trim()} on {detailData.page}
                  </div>
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-300 mb-2">
                  Reverted edits are highlighted in yellow.
                </div>
                <EditsList edits={detailData.edits} pageTitle={detailData.page} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
