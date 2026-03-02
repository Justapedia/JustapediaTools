"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Copy, Loader2, Settings2, Quote, FileText, Check, ChevronRight } from "lucide-react";
import {
  identifyType,
  generateRefName,
  generateRefNameFromCitation,
  sanitizeRefName,
  fetchFromCrossref,
  fetchFromPubMed,
  fetchFromSemanticScholar,
  fetchFromAmazon,
  fetchFromWeb,
  normalizeCitationForJustapedia,
} from "../utils/citationFetcher";

export default function CitationGenerator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedText, setCopiedText] = useState(null);
  
  // Options
  const [pipeStyle, setPipeStyle] = useState("spaced"); // spaced, compact, no-space
  
  // Results
  const [rawCitation, setRawCitation] = useState("");
  const [refName, setRefName] = useState("");

  useEffect(() => {
    const q = searchParams.get("query");
    if (q) {
      setInput(q);
      handleGenerate(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async (overrideInput) => {
    const val = (typeof overrideInput === "string" ? overrideInput : input).trim();
    if (!val) return;

    const currentQuery = searchParams.get("query") || "";
    if (currentQuery !== val) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("query", val);
      router.replace(`${pathname}?${params.toString()}`);
    }

    setLoading(true);
    setError("");
    setRawCitation("");
    setRefName("");

    try {
      const type = identifyType(val);
      let fetched = "";

      switch (type) {
        case "DOI":
        case "DOI_URL":
          fetched = await fetchFromCrossref(val);
          break;
        case "PMID":
          fetched = await fetchFromPubMed(val);
          break;
        case "S2CID":
          fetched = await fetchFromSemanticScholar(val);
          break;
        case "AMAZON_BOOK":
        case "ISBN":
          fetched = await fetchFromAmazon(val);
          break;
        case "WEB_URL":
          fetched = await fetchFromWeb(val);
          break;
        default:
          throw new Error("Unsupported identifier format. Try a URL, DOI, ISBN, or PMID.");
      }

      if (!fetched) throw new Error("No citation data returned.");

      const normalized = normalizeCitationForJustapedia(fetched);
      setRawCitation(normalized);
      
      // Generate a ref name immediately
      const generatedName = generateRefNameFromCitation(normalized) || generateRefName();
      setRefName(generatedName);

    } catch (err) {
      console.error(err);
      setError(err?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // --- Formatting Logic ---

  const formatDateValue = (dateStr) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (isNaN(dateObj.getTime())) return dateStr;

    const monthsLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${monthsLong[m-1]} ${d}, ${y}`;
  };

  const getFormattedCitation = () => {
    if (!rawCitation) return "";
    let formatted = rawCitation;

    // 1. Apply Date Format (includes archive-date now)
    formatted = formatted.replace(/(\|\s*(?:date|archive-date)=)(\d{4}-\d{2}-\d{2})/g, (match, prefix, dateVal) => {
      return `${prefix}${formatDateValue(dateVal)}`;
    });

    // 2. Apply Pipe Spacing
    if (pipeStyle === "compact") {
       formatted = formatted.replace(/\s*\|\s*/g, "|");
    } else if (pipeStyle === "compact-space") {
       formatted = formatted.replace(/\s*\|\s*/g, "| ");
    } else {
       formatted = formatted.replace(/\s*\|\s*/g, " | ");
    }

    return formatted;
  };

  const formattedBody = getFormattedCitation();

  const namedRefOutput = `<ref name="${refName}">${formattedBody}</ref>`;
  const selfClosingOutput = `<ref name="${refName}" />`;
  const refWithoutNameOutput = `<ref>${formattedBody}</ref>`;

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8">
      
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          Citation Generator
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          Create perfect Justapedia citations in seconds.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        
        {/* Input Area */}
        <div className="p-6 md:p-8 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
            <div className="relative group">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Paste URL, DOI, ISBN, PMID..."
                    className="w-full pl-5 pr-32 py-4 text-lg rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-sm group-hover:shadow-md"
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                />
                <button
                    onClick={() => handleGenerate()}
                    disabled={loading || !input.trim()}
                    className="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                    Generate
                </button>
            </div>
            {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2">
                   <span>⚠️</span> {error}
                </div>
            )}
        </div>

        {/* Options Panel (Collapsible-ish feel) */}
        <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-6 md:items-center justify-between">
             <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                <Settings2 className="w-4 h-4" />
                <span>Formatting Options</span>
             </div>
             
             <div className="flex flex-wrap gap-6">
                {/* Pipe Style Selector */}
                <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Spacing</label>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                        {[
                            { val: "spaced", label: " | " },
                            { val: "compact-space", label: "| " },
                            { val: "compact", label: "|" },
                        ].map((opt) => (
                            <button
                                key={opt.val}
                                onClick={() => setPipeStyle(opt.val)}
                                className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${
                                    pipeStyle === opt.val 
                                    ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
             </div>
        </div>

        {/* Results Section */}
        {rawCitation && (
          <div className="p-6 md:p-8 space-y-8 bg-zinc-50/30 dark:bg-zinc-900/30">
              
              {/* Named Reference Card */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-700 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 rounded-t-xl">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium">
                          <FileText className="w-4 h-4" />
                          Named Reference
                      </div>
                      <div className="text-xs text-zinc-400">Wiki Code</div>
                  </div>
                  <div className="p-4">
                      <pre className="w-full bg-zinc-900 text-zinc-100 p-4 rounded-lg text-xs font-mono overflow-x-auto mb-4 whitespace-pre-wrap">
                          {namedRefOutput}
                      </pre>
                      <div className="flex flex-wrap gap-2">
                          <ActionButton 
                             label="Copy Reference" 
                             onClick={() => copyText(namedRefOutput, "named-ref")} 
                             copied={copiedText === "named-ref"} 
                             primary
                          />
                          <ActionButton 
                             label="Copy <ref />" 
                             onClick={() => copyText(selfClosingOutput, "self-closing")} 
                             copied={copiedText === "self-closing"} 
                          />

                      </div>
                  </div>
              </div>

          </div>
        )}
        
        {!rawCitation && !loading && (
             <div className="p-12 text-center text-zinc-400 dark:text-zinc-600">
                 <Quote className="w-12 h-12 mx-auto mb-4 opacity-20" />
                 <p>Enter a URL or ID above to generate citations.</p>
             </div>
        )}

      </div>
    </div>
  );
}

function ActionButton({ label, onClick, copied, primary }) {
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${primary 
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow" 
                    : "bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                }
            `}
        >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : label}
        </button>
    );
}
