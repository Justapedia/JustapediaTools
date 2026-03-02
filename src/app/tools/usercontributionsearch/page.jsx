"use client";

import { useState } from "react";
import axios from "axios";
import { 
  Search, User, FileText, Calendar, 
  ArrowRight, AlertCircle, HelpCircle, 
  ChevronDown, ChevronUp, ExternalLink,
  History, Loader2
} from "lucide-react";

export default function UserContributionSearch() {
  const [pageTitle, setPageTitle] = useState("");
  const [username, setUsername] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!pageTitle.trim() || !username.trim()) return;

    setLoading(true);
    setError("");
    setResults(null);

    try {
      // Fetch revisions for the specific page filtered by user
      const res = await axios.get("/api/justapedia", {
        params: {
          action: "query",
          prop: "revisions",
          titles: pageTitle,
          rvuser: username,
          rvprop: "ids|timestamp|flags|comment|size|user",
          rvlimit: 500,
          format: "json",
          // origin: "*"
        }
      });

      const pages = res.data?.query?.pages;
      if (!pages) {
        throw new Error("No data returned from API");
      }

      const pageId = Object.keys(pages)[0];
      const pageData = pages[pageId];

      if (pageId === "-1") {
        setError(`The page "${pageTitle}" does not exist.`);
      } else if (!pageData.revisions || pageData.revisions.length === 0) {
        setResults([]); // Page exists but no edits by this user
      } else {
        setResults(pageData.revisions);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data. Please check your connection or try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <History className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">User Contribution Search</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Find all edits by a specific user to a single page
            </p>
          </div>
        </div>

        {/* Search Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <form onSubmit={handleSearch} className="grid md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Page Title
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="e.g. Main Page"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="e.g. WikiEditor"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-[46px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              Search
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl flex items-center gap-2 border border-red-100 dark:border-red-900/30">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
              <h2 className="font-bold flex items-center gap-2">
                Results
                <span className="text-sm font-normal text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                  {results.length} edits found
                </span>
              </h2>
              {results.length > 0 && (
                <a 
                  href={`https://justapedia.org/wiki/${encodeURIComponent(pageTitle)}?action=history`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  View Full History <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {results.length === 0 ? (
              <div className="p-12 text-center text-zinc-400">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No edits found for user <strong>{username}</strong> on page <strong>{pageTitle}</strong>.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {results.map((rev) => (
                  <div key={rev.revid} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
                          <a href={`https://justapedia.org/wiki/?diff=${rev.revid}`} target="_blank" rel="noreferrer" className="hover:underline">
                            prev
                          </a>
                          {" "}&bull;{" "}
                          <a href={`https://justapedia.org/wiki/?oldid=${rev.revid}`} target="_blank" rel="noreferrer" className="hover:underline">
                            {rev.revid}
                          </a>
                        </span>
                        <span className="text-sm text-zinc-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(rev.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-zinc-500">
                        {rev.size} bytes
                      </span>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <p className="text-zinc-800 dark:text-zinc-200">
                          {rev.comment ? (
                            <span className="italic">&quot;{rev.comment}&quot;</span>
                          ) : (
                            <span className="text-zinc-400 italic">No edit summary</span>
                          )}
                        </p>
                        {rev.flags && (
                          <div className="flex gap-1 mt-1">
                            {rev.minor !== undefined && (
                              <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 text-[10px] uppercase font-bold rounded">
                                Minor
                              </span>
                            )}
                            {rev.new !== undefined && (
                              <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 text-[10px] uppercase font-bold rounded">
                                New
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Help & Tips Section */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300">
              <HelpCircle className="w-5 h-5 text-blue-500" />
              Help & Tips
            </div>
            {showHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showHelp && (
            <div className="p-6 text-sm text-zinc-600 dark:text-zinc-400 space-y-4 bg-white dark:bg-zinc-900">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4" /> effective Searching
                  </h3>
                  <ul className="space-y-2 list-disc pl-4">
                    <li><strong>Exact Titles:</strong> Ensure the page title is spelled correctly, including capitalization (e.g., &quot;Main Page&quot; vs &quot;main page&quot;).</li>
                    <li><strong>Usernames:</strong> Usernames are case-sensitive. &quot;WikiUser&quot; is different from &quot;wikiuser&quot;.</li>
                    <li><strong>Redirects:</strong> If a page has been moved, try searching for the new title.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Understanding Results
                  </h3>
                  <ul className="space-y-2 list-disc pl-4">
                    <li><strong>Diff Links:</strong> Click &quot;prev&quot; to see exactly what changed in that specific edit.</li>
                    <li><strong>Minor Edits:</strong> Marked with a small &quot;MINOR&quot; badge. These are usually spelling fixes or formatting changes.</li>
                    <li><strong>New Pages:</strong> Marked with &quot;NEW&quot;. This indicates the user created the page.</li>
                  </ul>
                </div>
              </div>
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <p>
                  <strong>Note:</strong> This tool only shows the last 500 edits by default. For very active users on very active pages, older edits might not appear in this list.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
