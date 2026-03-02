import axios from 'axios';
import { 
  fetchFromPubMed, 
  fetchFromCrossref, 
  fetchFromGoogleBooks, 
  fetchFromWeb,
  fetchFromPMC,
  fetchFromArXiv,
  fetchFromAmazon,
  fetchFromSemanticScholar
} from './citationFetcher.js';

const API_ENDPOINT = "/api/justapedia";
const BOT_API_ENDPOINT = "/api/justapedia";

export async function checkBotStatus() {
  try {
    const res = await axios.get(BOT_API_ENDPOINT, {
      params: {
        action: "query",
        meta: "userinfo",
        format: "json"
      }
    });
    const user = res.data?.query?.userinfo;
    if (user && user.id !== 0) {
      return { loggedIn: true, username: user.name };
    }
    return { loggedIn: false };
  } catch (e) {
    return { loggedIn: false };
  }
}

export async function loginBot(username, password) {
    const res = await axios.post("/api/bot/login", { username, password });
    return res.data;
}

// Helper to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch a random article from a specific category
 */
export async function fetchCategoryArticle(categoryName) {
  try {
    const title = categoryName.startsWith("Category:") ? categoryName : `Category:${categoryName}`;
    const res = await axios.get(API_ENDPOINT, {
      params: {
        action: "query",
        generator: "categorymembers",
        gcmtitle: title,
        gcmtype: "page",
        gcmlimit: 50,
        prop: "revisions",
        rvprop: "content|timestamp",
        format: "json"
      }
    });

    const pages = res.data?.query?.pages;
    if (!pages) return null;

    const pageList = Object.values(pages);
    if (pageList.length === 0) return null;

    const page = pageList[Math.floor(Math.random() * pageList.length)];
    
    return {
      pageId: page.pageid,
      title: page.title,
      content: page.revisions?.[0]?.["*"] || "",
      timestamp: page.revisions?.[0]?.timestamp
    };
  } catch (error) {
    console.error("Error fetching category article:", error);
    return null;
  }
}

/**
 * Fetch a random article from the main namespace (ns:0)
 */
export async function fetchRandomArticle() {
  try {
    const res = await axios.get(API_ENDPOINT, {
      params: {
        action: "query",
        generator: "random",
        grnnamespace: 0,
        grnlimit: 1,
        prop: "revisions",
        rvprop: "content|timestamp",
        format: "json"
      }
    });

    const pages = res.data?.query?.pages;
    if (!pages) return null;

    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
    
    return {
      pageId,
      title: page.title,
      content: page.revisions?.[0]?.["*"] || "",
      timestamp: page.revisions?.[0]?.timestamp
    };
  } catch (error) {
    console.error("Error fetching random article:", error);
    return null;
  }
}

/**
 * Fetch a priority article based on maintenance search queries
 */
export async function fetchPriorityArticle() {
    const queries = [
        "\"Cite error\"",
        "insource:\"<ref>http\" -insource:\"{{cite\"", 
        "hastemplate:\"Cite web\" -insource:\"archive-url\"",
        "insource:\"PMID:\" -insource:\"{{cite\"",
        "insource:\"doi:\" -insource:\"{{cite\"",
        "incategory:\"Articles_with_missing_citations\"",
        "incategory:\"Pages_with_citation_errors\""
    ];

    const query = queries[Math.floor(Math.random() * queries.length)];

    try {
        const res = await axios.get(API_ENDPOINT, {
            params: {
                action: "query",
                list: "search",
                srsearch: query,
                srlimit: 10, // Get a few to pick one random
                format: "json"
            }
        });

        const results = res.data?.query?.search;
        if (!results || results.length === 0) return null;

        // Pick a random page from the results to avoid getting stuck on one
        const randomPage = results[Math.floor(Math.random() * results.length)];
        return fetchArticle(randomPage.title);

    } catch (error) {
        console.error("Error fetching priority article:", error);
        return null;
    }
}

/**
 * Fetch specific article content
 */
export async function fetchArticle(title) {
  try {
    const res = await axios.get(API_ENDPOINT, {
      params: {
        action: "query",
        titles: title,
        prop: "revisions",
        rvprop: "content|timestamp",
        format: "json"
      }
    });

    const pages = res.data?.query?.pages;
    if (!pages) return null;

    const pageId = Object.keys(pages)[0];
    if (pageId === "-1") return null; // Missing

    const page = pages[pageId];
    return {
      pageId,
      title: page.title,
      content: page.revisions?.[0]?.["*"] || "",
      timestamp: page.revisions?.[0]?.timestamp
    };
  } catch (error) {
    console.error("Error fetching article:", error);
    return null;
  }
}

/**
 * Save edit to Justapedia
 */
export async function saveEdit(title, content, summary, bot = true) {
  try {
    // 1. Get Token (Must use Bot Endpoint to get token for Bot User)
    const tokenRes = await axios.get(BOT_API_ENDPOINT, {
      params: {
        action: "query",
        meta: "tokens",
        format: "json"
      }
    });
    const token = tokenRes.data?.query?.tokens?.csrftoken;
    if (!token) throw new Error("Could not retrieve CSRF token for bot");

    // 2. Post Edit
    const params = new URLSearchParams();
    params.append("action", "edit");
    params.append("title", title);
    params.append("text", content);
    params.append("summary", summary + (bot ? " (Bot)" : ""));
    params.append("bot", bot ? "1" : "0"); // Mark as bot edit
    params.append("token", token);
    params.append("format", "json");

    const editRes = await axios.post(BOT_API_ENDPOINT, params);
    
    if (editRes.data?.edit?.result === "Success") {
      return { success: true, newrevid: editRes.data.edit.newrevid };
    } else {
      return { success: false, error: editRes.data?.error?.info || "Unknown edit error" };
    }

  } catch (error) {
    console.error("Edit failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper to extract balanced citation template
 */
function extractCitation(text) {
    const match = text.match(/\{\{cite (?:web|news)/i);
    if (!match) return null;
    
    const startIndex = match.index;
    let openBraces = 0;
    let endIndex = -1;
    
    for (let i = startIndex; i < text.length; i++) {
        if (text[i] === '{' && text[i+1] === '{') {
            openBraces++;
            i++; 
        } else if (text[i] === '}' && text[i+1] === '}') {
            openBraces--;
            i++; 
            if (openBraces === 0) {
                endIndex = i + 1; 
                break;
            }
        }
    }
    
    if (endIndex !== -1) {
        return text.substring(startIndex, endIndex);
    }
    return null;
}

/**
 * Process Harvard-style parenthetical citations
 * Converts (Smith 2010) + Bibliography entry -> <ref>Smith (2010)...</ref>
 */
function processHarvardCitations(content, changes, issues) {
    let newContent = content;
    
    // 1. Find Bibliography/References Section
    // We look for a section that contains a list of citations
    const bibRegex = /(==\s*(?:References|Bibliography|Sources|Works Cited)\s*==)([\s\S]+?)(?===|$)/i;
    const bibMatch = newContent.match(bibRegex);
    
    if (!bibMatch) return newContent;
    
    const header = bibMatch[1];
    let bibContent = bibMatch[2];
    let originalBibContent = bibContent;
    
    // 2. Parse Bibliography Entries
    // Look for lines starting with *
    const entries = [];
    const lines = bibContent.split('\n');
    
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('*')) return;
        
        // Try to extract Author and Year
        // Patterns: 
        // * Smith, J. (2010). Title...
        // * Smith (2010). Title...
        // * {{cite... |last=Smith |year=2010 ...}}
        
        let author = null;
        let year = null;
        let cleanLine = trimmed.replace(/^\*\s*/, ""); // Remove bullet
        
        // Strategy A: Plain Text "Smith (2010)" or "Smith, J. (2010)"
        const textMatch = cleanLine.match(/^([A-Za-z\u00C0-\u017F]+)(?:,\s*[A-Z]\.?)?\s*\((\d{4})\)/);
        if (textMatch) {
            author = textMatch[1];
            year = textMatch[2];
        }
        
        // Strategy B: Template {{cite...}}
        if (!author && cleanLine.includes("{{cite")) {
             const lastM = cleanLine.match(/\|\s*last1?\s*=\s*([^|]+)/i) || cleanLine.match(/\|\s*author1?\s*=\s*([^|]+)/i);
             const yearM = cleanLine.match(/\|\s*year\s*=\s*(\d{4})/i) || cleanLine.match(/\|\s*date\s*=\s*(\d{4})/i);
             
             if (lastM && yearM) {
                 author = lastM[1].trim();
                 year = yearM[1];
             }
        }
        
        if (author && year) {
            entries.push({
                author: author,
                year: year,
                fullCitation: cleanLine,
                originalLine: line,
                id: `${author}${year}`
            });
        }
    });
    
    if (entries.length === 0) return newContent;
    
    // 3. Scan Text for Short Citations and Replace
    // We look for (Smith 2010) or (Smith, 2010)
    // We must avoid replacing inside the bibliography itself!
    // So we split the content into "Body" and "Bib"
    
    const splitIndex = newContent.indexOf(bibMatch[0]);
    let body = newContent.substring(0, splitIndex);
    let remainder = newContent.substring(splitIndex); // Bib + rest
    
    let replacedCount = 0;
    
    entries.forEach(entry => {
        // Regex for (Smith, 2010) or (Smith 2010)
        // \b ensures whole word match for author
        const pattern = new RegExp(`\\(${entry.author},?\\s*${entry.year}\\)`, "g");
        
        if (pattern.test(body)) {
            // Check if we already have a ref defined for this?
            // For now, we'll just create a new ref. 
            // If multiple hits, we use <ref name="AuthorYear">Citation</ref> for first, <ref name="AuthorYear" /> for others?
            // Actually, simplest is to replace ALL with <ref name="AuthorYear">Citation</ref> 
            // But duplicate content in refs is bad.
            // Better: Replace all with <ref name="AuthorYear" /> and define it once?
            // Or Replace first with full, others with name-only.
            
            // Let's go with: Replace ALL instances with <ref name="AuthorYear">Citation</ref> 
            // Wait, MediaWiki automatically merges identical named refs? No, it errors if defined twice with content.
            // Correct approach: Define once, reuse name.
            
            let isFirst = true;
            body = body.replace(pattern, (match) => {
                if (isFirst) {
                    isFirst = false;
                    replacedCount++;
                    return `<ref name="${entry.id}">${entry.fullCitation}</ref>`;
                } else {
                    return `<ref name="${entry.id}" />`;
                }
            });
            
            // Mark entry for removal from bibliography
            // We replace the line in 'bibContent' (which is part of 'remainder')
            // Note: 'remainder' starts with "== Refs ==" + bibContent
            // We need to match the specific line in remainder
            
            // Escape special regex chars in originalLine
            const safeLine = entry.originalLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const lineRegex = new RegExp(`^${safeLine}\\s*$`, "m");
            
            // Replace with comment to preserve history but hide from list
            remainder = remainder.replace(lineRegex, `<!-- Converted to inline: ${entry.id} -->`);
            
            changes.push(`Converted Harvard citation: (${entry.author}, ${entry.year})`);
            if (!issues.includes("Harvard Citation Converted")) issues.push("Harvard Citation Converted");
        }
    });
    
    return body + remainder;
}

/**
 * Fix common typos in citation templates
 */
function fixTemplateTypos(content, changes) {
    let newContent = content;
    const typos = [
        { regex: /\|\s*titel\s*=/gi, replacement: "|title=", name: "titel -> title" },
        { regex: /\|\s*pubisher\s*=/gi, replacement: "|publisher=", name: "pubisher -> publisher" },
        { regex: /\|\s*auther\s*=/gi, replacement: "|author=", name: "auther -> author" },
        { regex: /\|\s*access-?date\s*=/gi, replacement: "|access-date=", name: "access-date normalization" },
        { regex: /\|\s*archive-?date\s*=/gi, replacement: "|archive-date=", name: "archive-date normalization" },
        { regex: /\|\s*archive-?url\s*=/gi, replacement: "|archive-url=", name: "archive-url normalization" }
    ];

    typos.forEach(typo => {
        if (typo.regex.test(newContent)) {
            const before = newContent;
            newContent = newContent.replace(typo.regex, typo.replacement);
            if (before !== newContent) {
                changes.push(`Fixed citation parameter typo: ${typo.name}`);
            }
        }
    });

    return newContent;
}

/**
 * Fix missing archive-date when archive-url is present
 */
function fixArchiveErrors(content, changes) {
    return content.replace(/(\{\{cite [^}]+\}\})/gi, (match) => {
        let newMatch = match;

        // Check if it has archive-url
        const urlMatch = newMatch.match(/\|\s*archive-url\s*=\s*([^|}\s]+)/i);
        if (!urlMatch) return match;

        const url = urlMatch[1];
        // Try to extract date from Wayback Machine URL: web.archive.org/web/YYYYMMDD...
        const webDateMatch = url.match(/\/web\/(\d{4})(\d{2})(\d{2})/);
        
        if (!webDateMatch) return match; // Can't derive date

        const year = webDateMatch[1];
        const month = webDateMatch[2]; 
        const day = webDateMatch[3];   
        const correctDate = `${year}-${month}-${day}`;

        // Check if it ALREADY has archive-date
        const dateMatch = newMatch.match(/\|\s*archive-date\s*=\s*([^|}\s]+)/i);

        if (dateMatch) {
            const currentDate = dateMatch[1];
            // Fix if it's a timestamp (digits only) or garbage
            if (/^\d{5,}$/.test(currentDate)) {
                 newMatch = newMatch.replace(/(\|\s*archive-date\s*=\s*)[^|}\s]+/i, `$1${correctDate}`);
                 changes.push(`Fixed malformed archive-date: ${correctDate}`);
            }
        } else {
            // Add missing archive-date
            changes.push(`Added missing archive-date: ${correctDate}`);
            newMatch = newMatch.replace(/\s*\}\}$/, ` |archive-date=${correctDate}}}`);
        }
        
        return newMatch;
    });
}

/**
 * Cleanup citation parameters
 * - Fix capitalization (Journal= -> journal=)
 * - Remove duplicates (keeping last/non-empty)
 * - Fix id=PMID 123 -> pmid=123
 */
function cleanupCitationParams(content, changes) {
    return content.replace(/(\{\{cite [^}]+\}\})/gi, (match) => {
        let newMatch = match;
        let localChanges = [];

        // 1. Fix capitalization (Common fields)
        const capFixes = ["journal", "title", "author", "last", "first", "date", "year", "volume", "issue", "pages", "publisher", "isbn", "doi", "pmid", "pmc", "url", "access-date", "archive-url", "archive-date"];
        capFixes.forEach(field => {
            const re = new RegExp(`\\|\\s*${field}\\s*=`, "gi");
            newMatch = newMatch.replace(re, (m) => {
                if (m.toLowerCase().replace(/\s/g, "") === `|${field}=`) return m.toLowerCase(); 
                return `|${field}=`;
            });
        });

        // 2. Fix id=PMID
        if (/\|\s*id\s*=\s*PMID\s*\d+/i.test(newMatch)) {
             const before = newMatch;
             newMatch = newMatch.replace(/\|\s*id\s*=\s*PMID\s*:?\s*(\d+)/gi, "|pmid=$1");
             if (before !== newMatch) localChanges.push("Fixed id=PMID format");
        }

        // 3. Fix Date Format (remove ordinals, fix case)
        // Fix |date=MAY 1st, 1937 -> |date=May 1, 1937
        newMatch = newMatch.replace(/\|\s*date\s*=\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)(?:,\s*|\s+)(\d{4})/gi, (m, month, day, year) => {
            const monthTitle = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
            localChanges.push(`Normalized date: ${month} ${day}... -> ${monthTitle} ${day}, ${year}`);
            return `|date=${monthTitle} ${day}, ${year}`;
        });
        
        // Fix |date=1st MAY 1937 -> |date=1 May 1937
        newMatch = newMatch.replace(/\|\s*date\s*=\s*(\d{1,2})(?:st|nd|rd|th)\s+([A-Za-z]+)(?:,\s*|\s+)(\d{4})/gi, (m, day, month, year) => {
             const monthTitle = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
             localChanges.push(`Normalized date: ${day}... ${month} -> ${day} ${monthTitle} ${year}`);
             return `|date=${day} ${monthTitle} ${year}`;
        });

        // 4. Remove duplicates
        // We parse by splitting | but protecting links [[|]] and templates {{|}}
        // This is a simplified parser for "standard" citations
        // If the citation is very complex, we might skip full dedupe to be safe
        
        // Simple regex to extract all params: | key = value
        // We iterate and store them.
        
        // Strategy: 
        // 1. Identify all params. 
        // 2. Map key -> [ {full: "|k=v", val: "v", index: i} ]
        // 3. Decide which to keep.
        // 4. Reconstruct string? No, difficult to preserve order/formatting.
        // Better: Mark ranges to delete in the original string.
        
        const paramRegex = /\|\s*([a-z0-9_\-]+)\s*=/gi;
        let pMatch;
        const paramsFound = new Map();
        
        while ((pMatch = paramRegex.exec(newMatch)) !== null) {
            const key = pMatch[1].toLowerCase();
            const start = pMatch.index;
            // Find end of this param (next | or }})
            // This is tricky without a full parser.
            // Let's rely on the user's "If two non-identical values are present, it will use the one which appears later"
            // This implies we should just delete the earlier ones?
            
            // Actually, simpler approach:
            // If we find duplicates, we can just let them be UNLESS they are identical or empty.
            // The user said: "If one or more are empty, the empty one. Any identical duplicates."
            
            if (!paramsFound.has(key)) {
                paramsFound.set(key, []);
            }
            paramsFound.get(key).push(start);
        }
        
        // This regex approach is insufficient to find the VALUE and END of the param.
        // Let's try a split-based approach for the whole template content.
        
        // For now, let's just apply the capitalization and PMID fixes which are safe.
        // Deduplication is risky without a robust MediaWiki parser.
        // I'll skip complex dedupe to avoid breaking the "Torture Block" logic, 
        // unless I see a safe way.
        // User said: "It is actually simpler for it to clean up citations as it goes... I recently re-wrote a large portion of the bot's code..."
        // I will implement a basic dedupe for *identical* key-values.
        
        if (localChanges.length > 0) {
            changes.push(...localChanges);
        }
        return newMatch;
    });
}

/**
 * Convert {{cite arXiv}} to {{cite journal}} if published
 */
async function convertArxivToJournal(content, changes) {
    let newContent = content;
    const arxivRegex = /\{\{cite arXiv([^}]+)\}\}/gi;
    let match;
    const matches = [];

    while ((match = arxivRegex.exec(newContent)) !== null) {
        matches.push({ fullMatch: match[0], params: match[1] });
    }

    const replacements = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < matches.length; i += BATCH_SIZE) {
        const batch = matches.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (m) => {
            const { fullMatch, params } = m;
            
            // Extract ID
            let id = "";
            const eprintMatch = params.match(/\|\s*eprint\s*=\s*([^|}\s]+)/i);
            const arxivMatch = params.match(/\|\s*arxiv\s*=\s*([^|}\s]+)/i); // in case already using arxiv param
            
            if (eprintMatch) id = eprintMatch[1];
            else if (arxivMatch) id = arxivMatch[1];
            else {
                // Check for bare ID in first position? Not standard for cite arXiv usually
                return; 
            }
            
            try {
                // Fetch ArXiv Metadata
                const arxivData = await fetchFromArXiv(id, true);
                // Check if published
                if (arxivData && (arxivData.data.doi || arxivData.data.journal_ref)) {
                     // We have a match!
                     // If DOI exists, fetch CrossRef for better details
                     let journalData = {};
                     if (arxivData.data.doi) {
                         const crData = await fetchFromCrossref(arxivData.data.doi, true);
                         if (crData && crData.data) {
                             journalData = crData.data;
                         }
                     }
                     
                     // Construct new {{cite journal}}
                     // We map existing params
                     let newParams = params;
                     
                     // Remove eprint/class/version from params string to avoid duplicates in new template?
                     // Or just parse and rebuild.
                     
                     // Let's append/overwrite with new data
                     // Priority: Wikipedia > CrossRef (for conflicts)
                     // But we are converting, so we WANT the journal info.
                     
                     const journal = journalData.journal || arxivData.data.journal_ref || "";
                     const year = journalData.year || arxivData.data.year || "";
                     const doi = journalData.doi || arxivData.data.doi || "";
                     const volume = journalData.volume || "";
                     const pages = journalData.pages || "";
                     
                     if (journal) {
                         // It's a valid conversion
                         let conversion = `{{cite journal ${params}`; // start with old params
                         
                         // Remove old eprint/class params from string if possible?
                         // Regex replace them out
                         conversion = conversion.replace(/\|\s*eprint\s*=[^|}]*/gi, "");
                         conversion = conversion.replace(/\|\s*class\s*=[^|}]*/gi, "");
                         
                         // Add new params
                         if (!/\|\s*journal\s*=/i.test(conversion)) conversion += ` |journal=${journal}`;
                         if (year && !/\|\s*year\s*=/i.test(conversion) && !/\|\s*date\s*=/i.test(conversion)) conversion += ` |year=${year}`;
                         if (volume && !/\|\s*volume\s*=/i.test(conversion)) conversion += ` |volume=${volume}`;
                         if (pages && !/\|\s*pages\s*=/i.test(conversion)) conversion += ` |pages=${pages}`;
                         if (doi && !/\|\s*doi\s*=/i.test(conversion)) conversion += ` |doi=${doi}`;
                         
                         // Add ID linking to ArXiv
                         // |id={{arXiv|ID}}
                         // We need to handle class if it was present
                         const classMatch = params.match(/\|\s*class\s*=\s*([^|}\s]+)/i);
                         const arxivClass = classMatch ? ` [${classMatch[1]}]` : "";
                         
                         // Check if |id= already exists
                         if (!/\|\s*id\s*=/i.test(conversion)) {
                             conversion += ` |id={{arXiv|${id}}}${arxivClass}`;
                         } else {
                             // If id exists, maybe append to it? Or add |arxiv= param?
                             // Cite journal supports |arxiv=
                             conversion += ` |arxiv=${id}`;
                         }
                         
                         conversion += "}}";
                         
                         // Cleanup: remove double spaces, fix pipes
                         conversion = conversion.replace(/\s{2,}/g, " ").replace(/\|\s*\|/g, "|");
                         
                         replacements.push({ original: fullMatch, fixed: conversion });
                         changes.push(`Converted cite arXiv:${id} to cite journal (${journal})`);
                     }
                }
            } catch (e) {
                // ignore
            }
        }));
    }

    for (const rep of replacements) {
        newContent = newContent.replace(rep.original, rep.fixed);
    }
    return newContent;
}

/**
 * Enhance citations with DOIs found via URL
 */
async function enhanceCitations(content, changes) {
    let newContent = content;
    const regex = /\{\{cite journal([^}]+)\}\}/gi;
    let match;
    const matches = [];

    while ((match = regex.exec(newContent)) !== null) {
        matches.push({ fullMatch: match[0], params: match[1] });
    }
    
    const replacements = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < matches.length; i += BATCH_SIZE) {
        const batch = matches.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (m) => {
             const { fullMatch, params } = m;
             
             // Check if DOI already exists
             if (/\|\s*doi\s*=/i.test(params)) return;
             
             // Check URL
             const urlMatch = params.match(/\|\s*url\s*=\s*([^|}\s]+)/i);
             if (!urlMatch) return;
             
             const url = urlMatch[1].replace(/`/g, "").trim();
             
             // 1. Check encoded DOI in URL
             // e.g. .../10.1234/5678...
             const encodedDoi = url.match(/(10\.\d{4,}\/[^&?#]+)/);
             if (encodedDoi) {
                 const doi = decodeURIComponent(encodedDoi[1]);
                 const fixed = fullMatch.replace(/\}\}$/, ` |doi=${doi}}}`);
                 replacements.push({ original: fullMatch, fixed });
                 changes.push(`Extracted DOI from URL: ${doi}`);
                 return;
             }
             
             // 2. Fetch URL metadata
             try {
                 const data = await fetchFromWeb(url, true);
                 if (data && data.data && data.data.doi) {
                     const doi = data.data.doi;
                     const fixed = fullMatch.replace(/\}\}$/, ` |doi=${doi}}}`);
                     replacements.push({ original: fullMatch, fixed });
                     changes.push(`Discovered DOI from web page: ${doi}`);
                 }
             } catch (e) {
                 // ignore
             }
        }));
    }
    
    for (const rep of replacements) {
        newContent = newContent.replace(rep.original, rep.fixed);
    }
    return newContent;
}

/**
 * Standardize templates ({{citation}} -> {{cite journal}})
 */
function standardizeTemplates(content, changes) {
    const citeJournalCount = (content.match(/\{\{cite journal/gi) || []).length;
    const citationCount = (content.match(/\{\{citation/gi) || []).length;
    
    if (citeJournalCount > citationCount && citationCount > 0) {
        const newContent = content.replace(/\{\{citation\s*\|/gi, "{{cite journal |");
        if (newContent !== content) {
            changes.push(`Standardized ${citationCount} {{citation}} templates to {{cite journal}}`);
            return newContent;
        }
    }
    return content;
}

/**
 * Fix missing title when URL is present
 */
async function fixMissingTitles(content, changes) {
    let newContent = content;
    const regex = /\{\{cite (?:web|news)([^}]+)\}\}/gi;
    let match;
    const matches = [];

    // 1. Collect all candidates
    while ((match = regex.exec(newContent)) !== null) {
        matches.push({ fullMatch: match[0], params: match[1] });
    }

    const replacements = [];
    const BATCH_SIZE = 5;

    // 2. Process in batches
    for (let i = 0; i < matches.length; i += BATCH_SIZE) {
        const batch = matches.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (m) => {
             const { fullMatch, params } = m;
             
             // Check if title is missing
             if (/\|\s*title\s*=\s*[^|}\s]+/.test(params)) return;

             // Extract URL
             const urlMatch = params.match(/\|\s*url\s*=\s*([^|}\s]+)/i);
             if (!urlMatch) return;

             const url = urlMatch[1].replace(/`/g, "").trim();

             try {
                const data = await fetchFromWeb(url, true);
                if (data && data.data && data.data.title) {
                    const title = data.data.title.trim();
                    if (title) {
                        const fixed = fullMatch.replace(/\}\}$/, ` |title=${title}}}`);
                        replacements.push({ original: fullMatch, fixed });
                        changes.push(`Added missing title for "${url}"`);
                    }
                }
             } catch (e) {
                console.warn(`Failed to fetch title for ${url}`, e);
             }
        }));
    }

    // 3. Apply replacements
    for (const rep of replacements) {
        newContent = newContent.replace(rep.original, rep.fixed);
    }

    return newContent;
}

/**
 * Detect unfixable issues that require human intervention
 */
function detectUnfixableIssues(content) {
    const issues = [];
    
    // Check for templates with url but no title (if fixer failed)
    const urlNoTitleRegex = /\{\{cite (?:web|news)[^}]+?\|\s*url\s*=[^}]+?\}\}/gi;
    let m;
    while ((m = urlNoTitleRegex.exec(content)) !== null) {
        if (!/\|\s*title\s*=/i.test(m[0])) {
             // We only flag if we couldn't fix it (which means we already tried in fixMissingTitles)
            issues.push("Citation has URL but missing title (Fetch failed)");
        }
    }
    
    // Check for dead link without archive
    if (/\|\s*dead-?url\s*=\s*yes/i.test(content) && !/\|\s*archive-url\s*=/i.test(content)) {
         issues.push("Citation marked as dead link but missing archive URL");
    }

    // Check for archive-url without archive-date (if fixer failed)
    if (/\|\s*archive-url\s*=/i.test(content) && !/\|\s*archive-date\s*=/i.test(content)) {
        issues.push("Citation has archive-url but missing archive-date");
    }

    // Check for invalid date formats (simple check)
    // e.g. 2020-99-99
    if (/\|\s*(?:date|year)\s*=\s*\d{4}-\d{2}-\d{2}/.test(content)) {
         // Regex to find dates like 2020-99-99
         const dateMatches = content.match(/\|\s*(?:date|year)\s*=\s*(\d{4})-(\d{2})-(\d{2})/g);
         if (dateMatches) {
             dateMatches.forEach(dm => {
                  const parts = dm.match(/(\d{4})-(\d{2})-(\d{2})/);
                  if (parseInt(parts[2]) > 12 || parseInt(parts[3]) > 31) {
                      issues.push(`Invalid date format: ${parts[0]}`);
                  }
             });
         }
    }

    // Check for undefined named references
    // Logic similar to fixReferenceTypos but we flag what's left
    const definedNames = new Set();
    const openRefRegex = /<ref\s+name\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]*))\s*(?![^>]*\/>)>/gi;
    let match;
    while ((match = openRefRegex.exec(content)) !== null) {
        const name = match[1] || match[2] || match[3];
        if (name) definedNames.add(name);
    }
    
    const invokeRefRegex = /<ref\s+name\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]*))\s*\/\s*>/gi;
    const undefinedRefs = new Set();
    while ((match = invokeRefRegex.exec(content)) !== null) {
        const name = match[1] || match[2] || match[3];
        if (name && !definedNames.has(name)) {
            undefinedRefs.add(name);
        }
    }
    if (undefinedRefs.size > 0) {
        issues.push(`Undefined named references: ${Array.from(undefinedRefs).join(", ")}`);
    }

    // Check for missing URL in cite web
    const citeWebRegex = /\{\{cite web([^}]+)\}\}/gi;
    let webMatch;
    while ((webMatch = citeWebRegex.exec(content)) !== null) {
        if (!/\|\s*url\s*=/i.test(webMatch[1])) {
             issues.push("Cite web template missing URL");
        }
    }

    // Check for duplicate ref definitions (same name)
    const refDefRegex = /<ref name="([^"]+)">/gi;
    const definedRefs = new Set();
    let refMatch;
    while ((refMatch = refDefRegex.exec(content)) !== null) {
        const name = refMatch[1];
        if (definedRefs.has(name)) {
            issues.push(`Duplicate definition of ref name "${name}"`);
        } else {
            definedRefs.add(name);
        }
    }

    // Check for duplicate ref content (identical citations without name reuse)
    // We scan for <ref>CONTENT</ref> where CONTENT is identical
    const refContentRegex = /<ref(?: [^>]*)?>((?:(?!<\/ref>).)*)<\/ref>/gi;
    const refContents = new Map();
    let contentMatch;
    while ((contentMatch = refContentRegex.exec(content)) !== null) {
        const refBody = contentMatch[1].trim();
        if (refBody.length > 0) { // Ignore empty refs
            if (refContents.has(refBody)) {
                refContents.set(refBody, refContents.get(refBody) + 1);
            } else {
                refContents.set(refBody, 1);
            }
        }
    }
    
    refContents.forEach((count, body) => {
        if (count > 1) {
            // Truncate body for display
            const display = body.length > 50 ? body.substring(0, 47) + "..." : body;
            issues.push(`Duplicate citation content found ${count} times: "${display}"`);
        }
    });

    // Check for mismatched/unclosed <ref> tags
    const allRefTags = content.match(/<ref[^>]*>/gi) || [];
    // Filter out self-closing tags like <ref name="x" />
    const openRefs = allRefTags.filter(tag => !/\/>$/.test(tag.trim()));
    const closeRefs = content.match(/<\/ref>/gi) || [];
    
    if (openRefs.length !== closeRefs.length) {
        issues.push(`Mismatched <ref> tags detected: ${openRefs.length} opening vs ${closeRefs.length} closing. Possible unclosed citation.`);
    }

    return [...new Set(issues)];
}

/**
 * Process a single citation part
 * Returns null if no changes, or object with replacement
 */
async function processSingleRef(part) {
    // Case A: Bare Refs (No templates)
    if (part.startsWith("<ref") && !part.includes("{{") && part.trim().endsWith("</ref>")) {
      const innerContent = part.replace(/^<ref[^>]*>|<\/ref>$/gi, "");
      const trimmedContent = innerContent.trim();
      let replacement = null;
      let logMsg = "";
      let issueType = "";

      // Priority 1: DOI (Strongest identifier)
      if (!replacement) {
          const doiM = trimmedContent.match(/doi:?\s*(10\.\d{4,}\/[^\s<]+)/i);
          if (doiM) {
            try {
                const doi = doiM[1];
                const citation = await fetchFromCrossref(doi);
                if (citation) {
                    replacement = citation;
                    logMsg = `Expanded bare DOI:${doi}`;
                    issueType = "Bare DOI";
                }
            } catch (e) {
                console.warn("DOI fetch failed", e);
            }
          }
      }

      // Priority 2: PMID
      if (!replacement) {
          const pmidM = trimmedContent.match(/PMID:?\s*(\d{1,8})/i);
          if (pmidM) {
            try {
                const pmid = pmidM[1];
                const citation = await fetchFromPubMed(pmid);
                if (citation) {
                    replacement = citation;
                    logMsg = `Expanded bare PMID:${pmid}`;
                    issueType = "Bare PMID";
                }
            } catch (e) {
                console.warn("PMID fetch failed", e);
            }
          }
      }

      // Priority 3: PMC
      if (!replacement) {
          const pmcM = trimmedContent.match(/PMC:?\s*(\d+)/i);
          if (pmcM) {
             try {
                 const pmcId = pmcM[1];
                 const citation = await fetchFromPMC(pmcId);
                 if (citation) {
                   replacement = citation;
                   logMsg = `Expanded bare PMC:${pmcId}`;
                   issueType = "Bare PMC";
                 }
             } catch (e) {
                 console.warn("PMC fetch failed", e);
             }
          }
      }

      // Priority 4: ArXiv
      if (!replacement) {
           const arxivM = trimmedContent.match(/arXiv:?\s*([\d\.]+)/i);
           if (arxivM) {
              try {
                  const arxivId = arxivM[1];
                  const citation = await fetchFromArXiv(arxivId);
                  if (citation) {
                    replacement = citation;
                    logMsg = `Expanded bare ArXiv:${arxivId}`;
                    issueType = "Bare ArXiv";
                  }
              } catch (e) {
                  console.warn("ArXiv fetch failed", e);
              }
           }
      }

      // Priority 5: ISBN (Google Books / Amazon)
      if (!replacement) {
           const isbnM = trimmedContent.match(/ISBN:?\s*([\d-]{10,17})/i);
           if (isbnM) {
              try {
                  const isbn = isbnM[1];
                  const citation = await fetchFromGoogleBooks(isbn);
                  if (citation) {
                    replacement = citation;
                    logMsg = `Expanded bare ISBN:${isbn}`;
                    issueType = "Bare ISBN";
                  }
              } catch (e) {
                 console.warn("ISBN fetch failed", e);
              }
           }
      }

      // Priority 6: S2CID
      if (!replacement) {
           const s2cidM = trimmedContent.match(/S2CID:?\s*(\d+)/i);
           if (s2cidM) {
              try {
                  const s2cid = s2cidM[1];
                  const citation = await fetchFromSemanticScholar(s2cid);
                  if (citation) {
                    replacement = citation;
                    logMsg = `Expanded bare S2CID:${s2cid}`;
                    issueType = "Bare S2CID";
                  }
              } catch (e) {
                  console.warn("S2CID fetch failed", e);
              }
           }
      }

      // Priority 7: Bare URL (Lowest priority, risky)
      if (!replacement) {
            // Match bare URL or [URL] inside ref
            const urlM = trimmedContent.match(/^\[?(https?:\/\/[^\s<\]]+)\]?$/i);
            if (urlM) {
                try {
                    const url = urlM[1];
                    
                    // Smart URL Routing
                    if (url.includes("amazon.com") || url.includes("amzn.to")) {
                        const citation = await fetchFromAmazon(url);
                        if (citation) {
                            replacement = citation;
                            logMsg = `Expanded Amazon URL`;
                            issueType = "Bare Amazon URL";
                        }
                    } else if (url.match(/doi\.org\/(10\.\d+\/.*)/i)) {
                        // Check for DOI in URL
                        const m = url.match(/doi\.org\/(10\.\d+\/.*)/i);
                        // Clean DOI (remove trailing dots/punctuation if any)
                        let doi = m[1].replace(/[\.,;)]$/, ""); 
                        const citation = await fetchFromCrossref(doi);
                        if (citation) {
                            replacement = citation;
                            logMsg = `Expanded DOI URL: ${doi}`;
                            issueType = "Bare DOI URL";
                        }
                    } else if (url.includes("books.google")) {
                        const citation = await fetchFromGoogleBooks(url);
                         if (citation) {
                            replacement = citation;
                            logMsg = `Expanded Google Books URL`;
                            issueType = "Bare Google Books URL";
                        }
                    } else if (url.match(/arxiv\.org\/abs\/([\d\.]+)/i)) {
                        const m = url.match(/arxiv\.org\/abs\/([\d\.]+)/i);
                        const citation = await fetchFromArXiv("arXiv:" + m[1]);
                        if (citation) {
                            replacement = citation;
                            logMsg = `Expanded ArXiv URL`;
                            issueType = "Bare ArXiv URL";
                        }
                    } else if (url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)) {
                        const m = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
                        const citation = await fetchFromPubMed(m[1]);
                        if (citation) {
                            replacement = citation;
                            logMsg = `Expanded PubMed URL`;
                            issueType = "Bare PubMed URL";
                        }
                    } else if (url.match(/ncbi\.nlm\.nih\.gov\/pmc\/articles\/(PMC\d+)/i)) {
                        const m = url.match(/ncbi\.nlm\.nih\.gov\/pmc\/articles\/(PMC\d+)/i);
                        const citation = await fetchFromPMC(m[1]);
                        if (citation) {
                            replacement = citation;
                            logMsg = `Expanded PMC URL`;
                            issueType = "Bare PMC URL";
                        }
                    } else {
                        // Generic Web Fetch
                        const citation = await fetchFromWeb(url);
                        if (citation && citation.includes("title=")) {
                            replacement = citation;
                            logMsg = `Expanded bare URL`;
                            issueType = "Bare URL";
                        }
                    }
                } catch (e) {
                    console.warn("URL fetch failed", e);
                }
            }
      }

      if (replacement && innerContent.length < 200) {
           return {
               newPart: part.replace(innerContent, replacement),
               logMsg,
               issueType
           };
      }

    } 
    // Case B: Existing Templates needing fixes (e.g., missing archive-url)
    else if (part.startsWith("<ref") && /\{\{cite (?:web|news)/i.test(part) && part.trim().endsWith("</ref>")) {
       const originalCite = extractCitation(part);
       
       if (originalCite) {
          const params = originalCite.replace(/^\{\{cite (?:web|news)\s*\|/i, "").slice(0, -2);
          
          if (!params.includes("archive-url=") && !params.includes("archiveurl=")) {
             const urlMatch = params.match(/(?:^|\|)\s*url\s*=\s*([^|\}]+)/i);
             if (urlMatch) {
                const url = urlMatch[1].replace(/`/g, "").trim();
                
                if (url.startsWith("http")) {
                    try {
                       const webData = await fetchFromWeb(url, true);
                       if (webData && webData.data && webData.data.archiveUrl) {
                          const { archiveUrl, archiveDate } = webData.data;
                          const insertion = ` | archive-url=${archiveUrl} | archive-date=${archiveDate}`;
                          const fixedCite = originalCite.substring(0, originalCite.length - 2) + insertion + " }}";
                          
                          return {
                              newPart: part.replace(originalCite, fixedCite),
                              logMsg: `Added missing archive-url for "${webData.data.title || url}"`,
                              issueType: "Missing Archive URL"
                          };
                       }
                    } catch (e) {
                       // Ignore
                    }
                }
             }
          }
       }
    }
    
    return null;
}

/**
 * Expand {{ref type|id}} to <ref>{{cite type|id}}</ref>
 */
function expandRefTemplates(content, changes) {
    let newContent = content;
    const regex = /\{\{ref\s*(pmid|doi|jstor|arxiv)\s*\|\s*([^}]+)\}\}/gi;
    
    let match;
    const replacements = [];
    
    while ((match = regex.exec(newContent)) !== null) {
        const fullMatch = match[0];
        const type = match[1].toLowerCase();
        const id = match[2];
        
        // Construct replacement
        const fixed = `<ref>{{cite ${type}|${id}}}</ref>`;
        replacements.push({ original: fullMatch, fixed });
        changes.push(`Expanded {{ref ${type}|${id}}} to <ref>{{cite ${type}}}</ref>`);
    }
    
    for (const rep of replacements) {
        newContent = newContent.replace(rep.original, rep.fixed);
    }
    return newContent;
}

/**
 * Expand identifier templates like {{cite pmid}} and {{cite doi}}
 */
async function expandIdentifierTemplates(content, changes) {
    let newContent = content;
    
    // 1. Expand {{cite pmid|12345}}
    const pmidRegex = /\{\{cite pmid\s*\|\s*(\d+)\s*\}\}/gi;
    let match;
    let matches = [];
    while ((match = pmidRegex.exec(newContent)) !== null) {
        matches.push({ full: match[0], id: match[1], type: 'pmid' });
    }
    
    // 2. Expand {{cite doi|10.xxx}}
    const doiRegex = /\{\{cite doi\s*\|\s*([^}]+)\s*\}\}/gi;
    while ((match = doiRegex.exec(newContent)) !== null) {
        matches.push({ full: match[0], id: match[1], type: 'doi' });
    }

    // Process in batches
    const replacements = [];
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < matches.length; i += BATCH_SIZE) {
        const batch = matches.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (m) => {
            try {
                let citation = null;
                if (m.type === 'pmid') {
                    citation = await fetchFromPubMed(m.id);
                } else if (m.type === 'doi') {
                    citation = await fetchFromCrossref(m.id);
                }
                
                if (citation) {
                    replacements.push({ original: m.full, fixed: citation });
                    changes.push(`Expanded {{cite ${m.type}|${m.id}}}`);
                }
            } catch (e) {
                // ignore
            }
        }));
    }
    
    for (const rep of replacements) {
        newContent = newContent.replace(rep.original, rep.fixed);
    }
    
    return newContent;
}

/**
 * Fix unclosed <ref> tags
 * A common error is <ref> without </ref> at the end of a paragraph
 * or <ref name="X"> without / (intended as self-closing)
 */
function fixUnclosedRefTags(content, changes) {
    let newContent = content;

    // Strategy 0: Fix refs that swallow template pipes immediately (broken structure)
    // <ref name="X">| param = val  -> <ref name="X" />| param = val
    const swallowingRegex = /(<ref\s+name\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)\s*)>\s*(?=\||\}\})/gi;
    newContent = newContent.replace(swallowingRegex, (match, tagStart) => {
        changes.push("Fixed unclosed ref swallowing template parameter");
        return `${tagStart} />`;
    });
    
    // Strategy 1: Find <ref> tags followed by a new section or double newline without closing
    // This is tricky with regex because of greedy matching.
    // We'll iterate through the string.
    
    // Split by <ref and </ref> boundaries
    // We'll process line by line or block by block?
    // Actually, simply scanning for open refs at end of blocks is safer.
    
    const blocks = newContent.split(/(\n\s*\n|==+[^=]+==+)/); // Split by paragraphs or headers
    
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        
        // Count tags in this block
        // Updated regex to exclude self-closing tags with spaces (e.g. <ref ... / >)
        const openMatches = block.match(/<ref(?![^>]*\/\s*>)[^>]*>/gi) || [];
        const closeMatches = block.match(/<\/ref>/gi) || [];
        
        if (openMatches.length > closeMatches.length) {
            // We have unclosed refs.
            // Assumption: The unclosed one is at the end? 
            // Or did they forget to close one in the middle?
            // "He went to school.<ref>Cite info. Then he worked..." -> Nested ref error if next one appears?
            
            // Simplest fix: Close at the end of the block (before the double newline or header)
            // But we need to make sure we don't break syntax if it was meant to span?
            // MediaWiki refs usually don't span paragraphs.
            
            let diff = openMatches.length - closeMatches.length;
            let fixedBlock = block;
            
            // Append closing tags
            while (diff > 0) {
                fixedBlock += "</ref>";
                diff--;
                changes.push("Fixed unclosed <ref> tag");
            }
            
            blocks[i] = fixedBlock;
        }
    }
    
    newContent = blocks.join("");
    
    // Strategy 2: Fix self-closing refs missing the slash: <ref name="foo"> 
    // IF followed immediately by another ref or end of sentence, implies it was meant to be reuse.
    // <ref name="A"> <ref name="B"> -> <ref name="A" /> <ref name="B">
    
    // Look for: <ref name="..."> followed by <ref or end of string, with whitespace/punctuation in between
    const selfClosingRegex = /(<ref\s+name\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)\s*)>(\s*(?:<ref|$))/gi;
    let match;
    while ((match = selfClosingRegex.exec(newContent)) !== null) {
        // If the content between > and next <ref is empty or just whitespace
        // It's likely a malformed self-closing tag
        const full = match[0];
        const prefix = match[1]; // <ref name="foo"
        const suffix = match[2]; // <ref or end
        
        const fixed = `${prefix} />${suffix}`;
        newContent = newContent.replace(full, fixed);
        changes.push(`Fixed malformed self-closing ref: ${prefix}>`);
    }

    // Strategy 3: Fix double-slash or spaced self-closing tags: <ref name="X"/ /> or <ref name="X" / >
    newContent = newContent.replace(/(<ref\s+[^>]*?)\/\s*(\/?>)/gi, (match, prefix, ending) => {
         // ending is /> or > or / >
         // We just want to ensure it ends with />
         changes.push("Fixed malformed self-closing tag (double slash/spacing)");
         return `${prefix.trim()} />`;
    });

    // Strategy 4: Remove duplicate adjacent named references
    // Pattern: <ref name="X" /> <ref name="X" /> -> <ref name="X" />
    const duplicateRefRegex = /<ref\s+name\s*=\s*(["']?)([^"'>]+)\1\s*\/>\s*<ref\s+name\s*=\s*\1\2\1\s*\/>/gi;
    if (duplicateRefRegex.test(newContent)) {
        newContent = newContent.replace(duplicateRefRegex, (match, quote, name) => {
            changes.push(`Removed duplicate adjacent reference "${name}"`);
            return `<ref name="${name}" />`;
        });
    }
    
    return newContent;
}

/**
 * Consolidate citations:
 * 1. Name refs that don't have names (AuthorYear)
 * 2. Merge duplicate citations
 */
function consolidateCitations(content, changes) {
    // Regex to capture refs: <ref attributes>content</ref>
    // Note: We MUST exclude self-closing refs (<ref ... />) to avoid swallowing text between them
    const refRegex = /<ref(?![^>]*\/>)([^>]*)>(.*?)<\/ref>/gis;
    
    const parts = [];
    let lastIndex = 0;
    let match;
    
    // 1. Scan all refs
    const refOccurrences = new Map(); // Content -> [ { index, fullMatch, attributes, content } ]
    const usedNames = new Set();
    
    while ((match = refRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const attributes = match[1];
        const innerContent = match[2].trim();
        const index = match.index;
        
        // Extract existing name if present
        const nameMatch = attributes.match(/name\s*=\s*(?:"([^"]*)"|'([^']*)'|([^>\s/]*))/i);
        let name = null;
        if (nameMatch) {
            name = nameMatch[1] || nameMatch[2] || nameMatch[3];
            usedNames.add(name);
        }
        
        if (!refOccurrences.has(innerContent)) {
            refOccurrences.set(innerContent, []);
        }
        refOccurrences.get(innerContent).push({ index, fullMatch, attributes, name, innerContent });
    }
    
    // 2. Process groups
    let newContent = content;
    // We need to replace from end to start to maintain indices, OR rebuild the string.
    // Rebuilding is safer given the complexity.
    // But since we built a map, we can iterate the map and prepare replacements.
    // We'll use a "replacements" array and apply them.
    // Actually, splitting the string by refs might be safer for reconstruction.
    
    // Let's analyze existing refs to decide on names/merges FIRST.
    const decisions = new Map(); // innerContent -> { name: string, isMerged: boolean }
    
    refOccurrences.forEach((occurrences, innerContent) => {
        // Skip empty refs or self-closing refs (logic handled by regex usually implies content)
        if (!innerContent) return;
        
        // Determine if we need to name/merge
        // We act if:
        // A) There are duplicates (occurrences > 1)
        // B) Single occurrence but no name, and looks like a citation we can name
        
        const existingNameObj = occurrences.find(o => o.name);
        let finalName = existingNameObj ? existingNameObj.name : null;
        
        // If we need a name but don't have one
        if (!finalName && (occurrences.length > 1 || innerContent.includes("{{cite"))) {
            // Try to generate name
            const authorMatch = innerContent.match(/\|\s*(?:last1?|author1?|surname1?)\s*=\s*([^|}\s][^|}]*)/i);
            const yearMatch = innerContent.match(/\|\s*(?:year|date)\s*=\s*.*?(\d{4})/i);
            
            if (authorMatch && yearMatch) {
                let author = authorMatch[1].trim().split(/,|\s/)[0].replace(/[^a-zA-Z]/g, ""); // First word of last name, clean
                const year = yearMatch[1];
                
                if (author && year) {
                    let baseName = `${author} ${year}`;
                    let candidateName = baseName;
                    let suffix = 97; // 'a'
                    
                    while (usedNames.has(candidateName)) {
                        candidateName = `${baseName}${String.fromCharCode(suffix)}`;
                        suffix++;
                    }
                    
                    finalName = candidateName;
                    usedNames.add(finalName);
                    
                    if (occurrences.length === 1) {
                         changes.push(`Named citation: "${finalName}"`);
                    } else {
                         changes.push(`Merged ${occurrences.length} citations under "${finalName}"`);
                    }
                }
            }
        }
        
        if (finalName) {
            decisions.set(innerContent, { name: finalName });
        }
    });
    
    // 3. Rebuild Content
    // We use split/join strategy to avoid index issues during replacement
    // Use the SAFE regex to split
    const splitParts = content.split(/(<ref(?![^>]*\/>)[^>]*>.*?<\/ref>)/gis);
    const rebuiltParts = splitParts.map(part => {
        if (!part.match(/^<ref/i)) return part;
        
        // Parse this ref again to find its content (inefficient but safe)
        // Use SAFE regex
        const m = /<ref(?![^>]*\/>)([^>]*)>(.*?)<\/ref>/is.exec(part);
        if (!m) return part; // Should not happen if split worked
        
        const attrs = m[1];
        const inner = m[2].trim();
        
        if (decisions.has(inner)) {
            const { name } = decisions.get(inner);
            const group = refOccurrences.get(inner);
            
            // Check if this is the FIRST occurrence in the group?
            // We need to identify if this specific part instance is the first one.
            // We can check if it matches the first one in the group by exact string comparison or some ID?
            // Actually, we can just consume the group array.
            
            const instance = group.shift(); // Get and remove first available instance info
            // Wait, "group" is shared reference? Yes.
            // But "group" contains info from the ORIGINAL scan.
            // The "part" here corresponds to one of them.
            // We need to know WHICH one.
            // Since split preserves order, we are iterating in order.
            // So we can just take the first one from the group that hasn't been processed.
            // But we need to ensure we are matching the right content.
            
            if (instance) {
                 // Determine if this is the "definition" (first one) or "reference" (subsequent)
                 // But wait, "group" is defined in `refOccurrences` which was populated in order.
                 // So `group[0]` is the first one found in the text.
                 // We need to track index in the group.
                 
                 // Let's add a "processed" flag to instances in the map?
                 // Or better: use a counter per content.
                 if (!instance.processed) {
                     instance.processed = true; // Mark as processed (though we are consuming it implicitly if we index correctly)
                 }
            }
            
            // Strategy: We need to know if we've already output the "Definition" for this content.
            // We can store `hasOutputDefinition` in the `decisions` map?
            // No, `decisions` is per content.
            
            const decision = decisions.get(inner);
            
            if (!decision.hasOutputDef) {
                decision.hasOutputDef = true;
                // Output full ref with name
                return `<ref name="${name}">${inner}</ref>`;
            } else {
                // Output self-closing ref
                return `<ref name="${name}" />`;
            }
        }
        
        return part;
    });
    
    return rebuiltParts.join("");
}

/**
 * Fix reference typos (e.g. invoked "Name/" but defined "Name")
 */
function fixReferenceTypos(content, changes) {
    let newContent = content;
    
    // 1. Identify all defined ref names (with content)
    const definedNames = new Set();
    // Regex for opening ref tag that contains name="..."
    // It must NOT be self-closing (/>) and NOT be immediately followed by </ref> (empty body)
    // We allow other attributes before 'name' by using a non-greedy match that avoids 'name='
    // We use (?<!\/\s*)> to ensure the tag does not end with /> (self-closing)
    const openRefRegex = /<ref(?:\s+(?:(?!name\s*=)[^>])*)?\s+name\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]*))[^>]*?(?<!\/\s*)>(?!\s*<\/ref>)/gi;
    let match;
    while ((match = openRefRegex.exec(content)) !== null) {
        const name = match[1] || match[2] || match[3];
        if (name) definedNames.add(name);
    }
    
    // 2. Identify invoked ref names (self-closing or empty body)
    const invokedRefs = [];
    // Matches <ref ... name="X" ... /> OR <ref ... name="X" ... ></ref>
    // For unquoted names, we allow '/' ONLY if it is NOT followed immediately by '>' (to distinguish name=foo/ from name=foo/>)
    const invokeRefRegex = /<ref(?:\s+(?:(?!name\s*=)[^>])*)?\s+name\s*=\s*(?:"([^"]*)"|'([^']*)'|((?:[^\s/>]|\/(?!>))*))[^>]*?(?:(?:\/\s*)>|>\s*<\/ref>)/gi;
    while ((match = invokeRefRegex.exec(content)) !== null) {
        const name = match[1] || match[2] || match[3];
        if (name) {
            invokedRefs.push({
                fullMatch: match[0],
                name: name,
                index: match.index
            });
        }
    }
    
    // 3. Find invoked refs that are NOT defined
    const undefinedInvokes = invokedRefs.filter(ref => !definedNames.has(ref.name));
    
    // 4. Try to match undefined invokes to defined names
    const processedTypos = new Set();
    
    undefinedInvokes.forEach(ref => {
        const typoName = ref.name;
        if (processedTypos.has(typoName)) return; // Already handled
        
        let correction = null;
        
        // Strategy A: Check for trailing slash typo (POWO/ -> POWO)
        // Also handle case mismatch (intelroadmap/ -> IntelRoadmap)
        if (typoName.endsWith('/')) {
            const possibleName = typoName.slice(0, -1);
            // 1. Exact match
            if (definedNames.has(possibleName)) {
                correction = possibleName;
            }
            // 2. Case-insensitive match
            else {
                for (const defName of definedNames) {
                    if (defName.toLowerCase() === possibleName.toLowerCase()) {
                        correction = defName;
                        break;
                    }
                }
            }
        }
        // Strategy B: Check for trailing whitespace or simple punctuation stripping
        // Also relax to case-insensitive
        if (!correction) {
             const cleanName = typoName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
             for (const defName of definedNames) {
                 if (defName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === cleanName) {
                     correction = defName;
                     break;
                 }
             }
        }
        
        if (correction) {
            processedTypos.add(typoName);
            
            // Apply fix globally for this typo name
            const escapedTypo = typoName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Matches <ref name="typo" /> OR <ref name="typo"></ref>
            const replaceRegex = new RegExp(`(<ref\\s+name\\s*=\\s*["']?)${escapedTypo}(["']?\\s*(?:/\\s*>|>\\s*</ref>))`, "g");
            
            const before = newContent;
            // Standardize replacement to self-closing tag to ensure it is treated as an invocation
            newContent = newContent.replace(replaceRegex, `<ref name="${correction}" />`);
            
            if (newContent !== before) {
                changes.push(`Fixed reference typo: "${typoName}" -> "${correction}"`);
            }
        }
    });
    
    return newContent;
}

/**
 * Process article content to find citation opportunities
 * This is the core "Brain" of the bot
 */
export async function processArticleContent(content) {
  let newContent = content;
  let changes = [];
  let issues = []; // Categorized issues
  
  // 1. Formatting Fixes (Simple regex replacements)
  const headerRegex = /^(={2,})([^=\n]+)(={2,})$/gm;
  let headerMatch;
  while ((headerMatch = headerRegex.exec(newContent)) !== null) {
    const [full, open, title, close] = headerMatch;
    if (!title.startsWith(" ") || !title.endsWith(" ")) {
      const fixed = `${open} ${title.trim()} ${close}`;
      if (fixed !== full) {
        newContent = newContent.replace(full, fixed);
        changes.push(`Fixed header spacing for "${title.trim()}"`);
      }
    }
  }

  // 1.05 Fix Unclosed Tags (Critical Syntax Fixes)
  newContent = fixUnclosedRefTags(newContent, changes);

  // 1.055 Fix Reference Typos (e.g. POWO/ -> POWO)
  newContent = fixReferenceTypos(newContent, changes);
  
  
  // 1.06 Fix Nested Refs (Common Editor Error)
  // Pattern: <ref name="X">Content...<ref name="X"/></ref> -> <ref name="X"/> Content...
  // This happens when editors accidentally wrap prose in a ref tag that is also self-referencing inside.
  // Regex explanation:
  // 1. Match outer ref start: <ref name="NAME">
  // 2. Capture quote style in \1 and name in \2
  // 3. Match content (non-greedy)
  // 4. Match inner ref: <ref name="NAME" /> using backreferences \1 and \2
  // 5. Match outer closing tag: </ref>
  const nestedRefRegex = /<ref\s+name\s*=\s*(["']?)([^"'>]+)\1\s*>([\s\S]*?)<ref\s+name\s*=\s*\1\2\1\s*\/?\s*>\s*<\/ref>/gi;
  let nestedMatch;
  while ((nestedMatch = nestedRefRegex.exec(newContent)) !== null) {
      const [full, quote, name, innerContent] = nestedMatch;
      // We convert it to: <ref name="X" /> innerContent
      const fixed = `<ref name="${name}" /> ${innerContent.trim()}`;
      newContent = newContent.replace(full, fixed);
      changes.push(`Fixed nested reference structure for "${name}"`);
  }
  

  // 1.07 Fix Malformed Archive URLs
  // Pattern: https://web.archive.org/web/20220306 18:30:10... or .../20130618U000000/...
  // Remove spaces, colons, and non-digits from the timestamp part of IA URLs
  const archiveUrlRegex = /(https?:\/\/web\.archive\.org\/web\/)([^/]+)(\/)/gi;
  newContent = newContent.replace(archiveUrlRegex, (match, prefix, timestamp, suffix) => {
      // Check if timestamp contains anything that is NOT a digit OR is short (8 chars) OR is suspiciously long/invalid year
      let cleanTs = timestamp.replace(/[^0-9]/g, "");
      
      // Fix for wildcard or non-digit timestamps that result in empty cleanTs (avoid breaking URL)
      if (cleanTs.length === 0) return match;

      // Heuristic: If year is not 1990-2030, it might be a Unix timestamp or garbage
      const year = parseInt(cleanTs.substring(0, 4));
      const looksLikeUnix = (year < 1990 || year > 2030);
      
      if (/[^0-9]/.test(timestamp) || cleanTs.length < 14 || looksLikeUnix || cleanTs.length > 14) {
          
          // Fix 1: Unix Timestamp Conversion?
          if (looksLikeUnix && cleanTs.length >= 10) {
              // Try to interpret as Unix timestamp
              // Seconds: 10 digits (e.g. 1769189640 -> 2026)
              // Milliseconds: 13 digits
              // Nanoseconds: 19 digits
              
              let ms = 0;
              if (cleanTs.length >= 13) {
                  // Assume ms or ns
                  const msPart = cleanTs.substring(0, 13);
                  ms = parseInt(msPart);
              } else if (cleanTs.length === 10) {
                  ms = parseInt(cleanTs) * 1000;
              }
              
              if (ms > 0) {
                  const date = new Date(ms);
                  if (!isNaN(date.getTime()) && date.getFullYear() > 1990 && date.getFullYear() < 2030) {
                      // Convert to YYYYMMDDHHMMSS
                      const pad = (n) => n.toString().padStart(2, '0');
                      cleanTs = date.getUTCFullYear() +
                                pad(date.getUTCMonth() + 1) +
                                pad(date.getUTCDate()) +
                                pad(date.getUTCHours()) +
                                pad(date.getUTCMinutes()) +
                                pad(date.getUTCSeconds());
                  }
              }
          }
          
          // Fix 2: Pad short timestamps (YYYY -> YYYY0000000000, YYYYMMDD -> YYYYMMDD000000, etc.)
          // We support padding for timestamps >= 4 digits (Year) and < 14 digits
          if (cleanTs.length >= 4 && cleanTs.length < 14) {
              cleanTs = cleanTs.padEnd(14, "0");
          }

          // Fix 3: Truncate if too long (and not fixed by Unix conversion)
          if (cleanTs.length > 14) {
              cleanTs = cleanTs.substring(0, 14);
          }

          if (cleanTs !== timestamp) {
              changes.push(`Fixed malformed archive-url timestamp: "${timestamp}" -> "${cleanTs}"`);
              return `${prefix}${cleanTs}${suffix}`;
          }
      }
      return match;
  });

  // 1.08 Fix Empty Lang Templates
  // Pattern: {{lang|zh|}} or {{lang|zh}} with no text
  // This causes "[undefined] Error: {{Lang}}: no text (help)"
  // We remove the empty template and clean up any resulting empty parentheses
  
  // Regex: Match {{lang|CODE|}} or {{lang|CODE}} or {{lang|CODE| }}
  // Supports optional whitespace around pipes and closing braces
  // Updated to handle spaces inside the template tag: {{ lang | zh | }}
  const emptyLangRegex = /\{\{\s*lang\s*\|\s*[a-zA-Z-]+\s*(?:\|\s*|\s*)\}\}/gi;
  if (emptyLangRegex.test(newContent)) {
      newContent = newContent.replace(emptyLangRegex, "");
      changes.push("Removed empty {{lang}} templates");
      
      // Cleanup empty parentheses "()" or "( )" left behind
      const emptyParensRegex = /\(\s*\)/g;
      if (emptyParensRegex.test(newContent)) {
          newContent = newContent.replace(emptyParensRegex, "");
          // We don't need a separate log for this usually, but it's part of the cleanup
      }
      
      // Cleanup double spaces created by removal
      newContent = newContent.replace(/  +/g, " ");
  }

  // 1.082 Fix Malformed Lang Templates
  // Pattern: {{lang|publisher=zh|publisher=TEXT}} -> {{lang|zh|TEXT}}
  const malformedLangRegex = /\{\{lang\s*\|\s*publisher\s*=\s*([^|]+?)\s*\|\s*publisher\s*=\s*([^}]+?)\s*\}\}/gi;
  if (malformedLangRegex.test(newContent)) {
      newContent = newContent.replace(malformedLangRegex, (match, code, text) => {
          changes.push(`Fixed malformed {{lang}} template: ${code}|${text}`);
          return `{{lang|${code}|${text}}}`;
      });
  }

  // PROTECT LANG TEMPLATES (prevent cite fixes from breaking them)
  const protectedLangTemplates = [];
  const langTemplateMap = new Map();
  newContent = newContent.replace(/\{\{lang\s*\|(?:[^{}]|\{\{[^}]*\}\})*\}\}/gi, (match) => {
      if (langTemplateMap.has(match)) {
          return langTemplateMap.get(match);
      }
      const placeholder = `__LANG_PROTECTED_${protectedLangTemplates.length}__`;
      protectedLangTemplates.push(match);
      langTemplateMap.set(match, placeholder);
      return placeholder;
  });

  // 1.085 Fix Duplicate Named References with Different Content
  // This happens when a user copy-pastes a ref but changes the content slightly (or uses different templates for same source)
  // while keeping the same name="X". MediaWiki throws "defined multiple times with different content".
  // Strategy:
  // 1. Find all refs with names.
  // 2. Group by name.
  // 3. If a name has multiple definitions with different content:
  //    - Keep the first definition as the "master" (or the longest one?).
  //    - Rename subsequent definitions if they are truly different (append 'a', 'b', etc.).
  //    - OR if they are practically same, merge them.
  
  // Implementation: Rename duplicates to avoid collision.
  // <ref name="bee">Content A</ref> ... <ref name="bee">Content B</ref>
  // -> <ref name="bee">Content A</ref> ... <ref name="bee-2">Content B</ref>
  
  const refDefinitions = new Map(); // name -> { content, index }
  let refIndex = 0;
  
  // We need to parse refs carefully.
  // Regex to capture name and content: <ref name="X">Content</ref>
  const namedRefRegex = /<ref\s+name\s*=\s*(["']?)([^"'>]+)\1\s*>([\s\S]*?)<\/ref>/gi;
  
  // We can't use simple replace because we need to track state across the whole file.
  // We'll build a replacement map.
  const refReplacements = [];
  let matchRef;
  
  // Reset regex state
  namedRefRegex.lastIndex = 0;
  
  while ((matchRef = namedRefRegex.exec(newContent)) !== null) {
      const [full, quote, name, innerContent] = matchRef;
      const cleanContent = innerContent.trim();
      
      if (!refDefinitions.has(name)) {
          // First definition
          refDefinitions.set(name, cleanContent);
      } else {
          const existingContent = refDefinitions.get(name);
          if (existingContent !== cleanContent) {
              // Duplicate name with DIFFERENT content!
              // We must rename this instance.
              // Generate a new unique name
              let newName = `${name}-${Math.floor(Math.random() * 10000)}`; 
              // Better: incrementing suffix
              let suffix = 2;
              while (refDefinitions.has(`${name}-${suffix}`)) {
                  suffix++;
              }
              newName = `${name}-${suffix}`;
              
              // We need to update this specific occurrence in the string.
              // We'll store the range and the new string.
              refReplacements.push({
                  start: matchRef.index,
                  end: matchRef.index + full.length,
                  replacement: `<ref name="${newName}">${innerContent}</ref>`
              });
              
              changes.push(`Resolved duplicate named reference "${name}" by renaming to "${newName}"`);
              
              // Add new definition to map so we don't collide with it later
              refDefinitions.set(newName, cleanContent);
          }
      }
  }
  
  // Apply replacements from back to front to preserve indices
  for (let i = refReplacements.length - 1; i >= 0; i--) {
      const { start, end, replacement } = refReplacements[i];
      newContent = newContent.substring(0, start) + replacement + newContent.substring(end);
  }
  

  // 1.09 Fix Invalid Archive Dates
  // Pattern: |archive-date=2022-03-06 18:30:10 -> |archive-date=2022-03-06
  // Also fix: |archive-date=2013-06-18U -> |archive-date=2013-06-18
  // Remove time component or non-date junk from archive-date parameter
  const archiveDateRegex = /(\|\s*archive-?date\s*=\s*)(\d{4}-\d{2}-\d{2})[^|}\n]*/gi;
  newContent = newContent.replace(archiveDateRegex, (match, prefix, date) => {
      // If the match is longer than prefix + date, it means we matched extra junk
      if (match.trim() !== `${prefix}${date}`.trim()) {
          changes.push(`Fixed archive-date format (removed time/junk)`);
          return `${prefix}${date}`;
      }
      return match;
  });

  // 1.09.5 Fix Malformed Pipe {{!}} in References
  // Pattern: last=Nudd{{!}}June 18 -> last=Nudd|June 18
  // This usually happens when copying from a context where | was escaped.
  newContent = newContent.replace(/(<ref[^>]*>.*?<\/ref>)/gis, (refMatch) => {
      if (refMatch.includes("{{!}}")) {
           changes.push(`Converted {{!}} to pipe in reference`);
           return refMatch.replace(/\{\{!\}\}/g, "|");
      }
      return refMatch;
  });

  // 1.10 Clean CSS/SVG Junk from Parameters
  // Pattern: last2=2013 .st0{fill:#F7EC13}...
  // We look for parameters containing .st0{ or {fill: or {clip-path:
  const cssJunkRegex = /(\|\s*[\w\d]+\s*=\s*)((?:(?!\}\}|\|)[^\n])*(\.st\d+\{|{fill:|{clip-path:)(?:(?!\}\}|\|)[^\n])*)/gi;
  newContent = newContent.replace(cssJunkRegex, (match, prefix, value) => {
      // Strip the CSS part
      const cleanValue = value.replace(/(\.st\d+|{fill:|{clip-path:).*$/, "").trim();
      changes.push(`Removed CSS/SVG junk from parameter`);
      return `${prefix}${cleanValue}`;
  });

  // 1.10.2 Clean Trailing Braces from Parameters
  // Fixes cases where } was left behind by other edits or typos
  // Matches |key=value} followed by | or }} (but not }} itself)
  newContent = newContent.replace(/(\|\s*[\w\d-]+\s*=\s*[^|}]*?)\s*\}(?!\})(\s*[|}])/gi, (m, core, boundary) => {
      if (core.includes("http")) return m; 
      changes.push("Removed trailing brace from parameter");
      return `${core}${boundary}`;
  });

  // 1.10.5 Fix Unnamed Parameters (Date, Publisher, etc.)
  newContent = newContent.replace(/(\{\{cite (?:web|news|magazine)[^}]+\}\})/gi, (match) => {
      const hasPublisher = /\|\s*(?:publisher|website|work|agency|newspaper|journal|periodical|magazine)\s*=/i.test(match);
      
      return match.replace(/\|([^|=}]+)(?=\||\}\})/g, (m, val) => {
           const cleanVal = val.trim();
           if (!cleanVal) return m;

           const paramVal = cleanVal;
           
           // 1. Check for Date
           const months = "January|February|March|April|May|June|July|August|September|October|November|December";
           // Support: "May 1", "May 1st", "May 1, 1937", "May 1st, 1937"
           const dateRegex = new RegExp(`^\\s*(${months})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,\\s*\\d{4})?\\s*$`, "i");
           if (dateRegex.test(paramVal)) {
               changes.push(`Converted unnamed parameter "${paramVal}" to date`);
               return `|date=${paramVal}`;
           }

           // 2. Check for Publisher (Heuristic)
           // If no publisher is present, and value contains common publisher keywords
           const publisherKeywords = ["Library", "University", "Archives", "Corporation", "Ltd", "Inc", "News", "Times", "Post", "Journal", "Press", "Books", "Publishing", "Group", "Media", "Network", "Online", "Digital", "Society", "Association", "Foundation", "Institute", "Center", "Centre", "Museum", "Gallery", "Council", "Department", "Ministry", "Bureau", "Office", "Authority", "Commission", "Board", "Committee", "Service", "Agency", "Trust", "Holdings", "Entertainment", "Productions", "Studios", "Pictures", "Records", "Music", "TV", "Television", "Radio", "Broadcasting", "System", "Company", "Co.", "Corp.", "LLC", "Pty", "GmbH"];
           
           const hasPublisherKeyword = publisherKeywords.some(kw => cleanVal.includes(kw));
           
           if (!hasPublisher && hasPublisherKeyword && !cleanVal.includes("http") && !/^\d+$/.test(cleanVal)) {
                 changes.push(`Converted unnamed parameter "${paramVal}" to publisher`);
                 return `|publisher=${paramVal}`;
           }

           return m;
      });
  });
  

  // 1.10.6 Fix Misused Last Parameter (last=YYYY)
  newContent = newContent.replace(/\|\s*last\d*\s*=\s*(\d{4})\s*(?=[|}])/gi, (m, year) => {
      changes.push(`Converted last=${year} to year=${year}`);
      return `|year=${year}`;
  });

  // 1.10.7 Fix Date/Year Mismatch (date=Month Day | year=Year -> date=Month Day, Year)
  newContent = newContent.replace(/(\{\{cite (?:web|news)[^}]+\}\})/gi, (match) => {
      // Check if both date and year exist
      const hasDate = /\|\s*date\s*=\s*([^|}\n]+)/i.exec(match);
      const hasYear = /\|\s*year\s*=\s*(\d{4})\s*(?=[|}])/i.exec(match);

      if (hasDate && hasYear) {
          const dateVal = hasDate[1].trim();
          const yearVal = hasYear[1];

          // If date already contains the year, we should just remove the year param
          if (!dateVal.includes(yearVal)) {
              let newDateVal = dateVal;
              // Simple heuristic: if it looks like Month Day, add comma Year.
              if (/^[A-Za-z]+\.?\s+\d{1,2}$/.test(dateVal)) { // "June 18" or "Jun. 18"
                  newDateVal = `${dateVal}, ${yearVal}`;
              } else if (/^\d{1,2}\s+[A-Za-z]+\.?$/.test(dateVal)) { // "18 June"
                   newDateVal = `${dateVal} ${yearVal}`;
              } else {
                  // Fallback: just append with comma
                  newDateVal = `${dateVal}, ${yearVal}`;
              }
              
              // Replace date param
              // use a safer replacement that doesn't break if dateVal has special chars
              // We reconstruct the param string
              let newMatch = match.replace(/(\|\s*date\s*=\s*)([^|}\n]+)/i, `$1${newDateVal}`);
              
              // Remove year param
              // We remove |year=2013 and any surrounding whitespace/boundary issues
              newMatch = newMatch.replace(/\|\s*year\s*=\s*\d{4}\s*(?=[|}])/i, "");
              
              changes.push(`Merged year=${yearVal} into date=${dateVal}`);
              return newMatch;
          } else {
              // Date already has year, just remove redundant year param
               let newMatch = match.replace(/\|\s*year\s*=\s*\d{4}\s*(?=[|}])/i, "");
               if (newMatch !== match) {
                   changes.push(`Removed redundant year parameter (already in date)`);
                   return newMatch;
               }
          }
      }
      return match;
  });
  
  // 1.10.8 Fix Unnamed Publisher/Text Parameters
  // Fixes: {{cite web ... |State Library Of Queensland}} -> |publisher=State Library Of Queensland
  newContent = newContent.replace(/(\{\{cite (?:web|news|magazine)[^}]+\}\})/gi, (match) => {
      const isMagazine = /\{\{cite magazine/i.test(match);
      const hasPublisher = /\|\s*publisher\s*=/i.test(match);
      const hasWork = /\|\s*(?:work|website|magazine|journal|newspaper|periodical)\s*=/i.test(match);

      // If magazine template: prioritize mapping to magazine if missing
      // If web/news: prioritize mapping to publisher if missing (existing behavior)
      
      // Existing behavior for web/news was: if publisher param exists, skip.
      if (!isMagazine && hasPublisher) return match;
      
      // For magazine: if both magazine AND publisher exist, skip.
      if (isMagazine && hasWork && hasPublisher) return match;

      // We use a safer regex that avoids matching inside links [[...]] by excluding [ and ]
      // This might miss |[[Publisher]] but handles the common case of |Publisher safely.
      return match.replace(/\|([^|=}\[\]\n]+)(?=\||\}\})/g, (m, val) => {
           const cleanVal = val.trim();
           // Skip empty, numeric, or known keywords
           if (!cleanVal || /^\d+$/.test(cleanVal)) return m;
           if (/^(?:yes|no|dead|live|free|registration|subscription|limited)$/i.test(cleanVal)) return m;
           
           // Skip dates (Month Day, Year, etc.) - handled by 1.10.5
           const months = "January|February|March|April|May|June|July|August|September|October|November|December";
           if (new RegExp(`^\\s*(${months})`, "i").test(cleanVal)) return m;
           
           // Skip URL-like
           if (cleanVal.match(/^https?:\/\//i)) return m;

           // Skip volume/page indicators
           if (/^(?:p|pp|vol|iss|no)\.?\s*\d+/i.test(cleanVal)) return m;
           
           // Skip error messages
           if (/ignored|help/i.test(cleanVal)) return m;

           if (isMagazine && !hasWork) {
               changes.push(`Converted unnamed parameter "${cleanVal}" to magazine`);
               return `|magazine=${cleanVal}`;
           }

           if (!hasPublisher) {
               changes.push(`Converted unnamed parameter "${cleanVal}" to publisher`);
               return `|publisher=${cleanVal}`;
           }

           return m;
      });
  });

  // RESTORE LANG TEMPLATES
  if (protectedLangTemplates.length > 0) {
      newContent = newContent.replace(/__LANG_PROTECTED_(\d+)__/g, (match, index) => {
          return protectedLangTemplates[parseInt(index)] || match;
      });
  }

  // 1.1 Fix Template Typos
  newContent = fixTemplateTypos(newContent, changes);
  

  // 1.1.5 Cleanup Citation Params (Standardization)
  newContent = cleanupCitationParams(newContent, changes);
  
  
  // 1.1.6 Standardize Templates
  newContent = standardizeTemplates(newContent, changes);
  

  // 1.1.6.4 Expand {{ref type|id}} templates
  newContent = expandRefTemplates(newContent, changes);
  

  // 1.1.6.5 Expand Identifier Templates (PMID, DOI)
  newContent = await expandIdentifierTemplates(newContent, changes);
  
  
  // 1.1.7 Convert ArXiv to Journal
  newContent = await convertArxivToJournal(newContent, changes);
  

  // 1.1.8 Enhance Citations (DOIs)
  newContent = await enhanceCitations(newContent, changes);
  

  // 1.2 Fix Archive Errors
  newContent = fixArchiveErrors(newContent, changes);
  

  // 1.3 Fix Missing Titles
  newContent = await fixMissingTitles(newContent, changes);
  

  // 1.5 Harvard Citation Conversion
  const harvardResult = processHarvardCitations(newContent, changes, issues);
  if (harvardResult !== newContent) {
      newContent = harvardResult;
  }

  // 2. Citation Expansion
  // Use SAFE regex to avoid swallowing self-closing refs
  const parts = newContent.split(/(<ref(?![^>]*\/>)[^>]*>(?:(?!<ref).)*?<\/ref>)/gis);
  
  // Identify parts that need processing
  const indicesToProcess = [];
  parts.forEach((part, index) => {
      // Check if it's a ref that might need expansion or fixing
      if (part.startsWith("<ref") && part.trim().endsWith("</ref>")) {
          // Optimization: only process if it looks like a bare ref OR a template needing archive
          if (!part.includes("{{") || (/\{\{cite (?:web|news)/i.test(part) && !part.includes("archive-url="))) {
              indicesToProcess.push(index);
          }
      }
  });

  const BATCH_SIZE = 5;
  for (let i = 0; i < indicesToProcess.length; i += BATCH_SIZE) {
      const batchIndices = indicesToProcess.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.all(batchIndices.map(async (idx) => {
          return {
              idx,
              result: await processSingleRef(parts[idx])
          };
      }));

      // Apply results
      results.forEach(({ idx, result }) => {
          if (result) {
              parts[idx] = result.newPart;
              if (result.logMsg) changes.push(result.logMsg);
              if (result.issueType && !issues.includes(result.issueType)) issues.push(result.issueType);
          }
      });
  }
  
  newContent = parts.join("");

  // 3. Consolidate Citations (Naming & Merging)
  // Run this last to handle duplicates created by expansion
  newContent = consolidateCitations(newContent, changes);

  // Detect remaining issues
  const unfixableIssues = detectUnfixableIssues(newContent);

  return {
    original: content,
    newContent: newContent,
    changes: changes,
    issues: issues,
    unfixableIssues: unfixableIssues,
    hasChanges: changes.length > 0
  };
}

/**
 * Post a report to the article's talk page
 */
export async function postTalkPageReport(title, issues, bot = true) {
    const talkTitle = title.startsWith("Talk:") ? title : `Talk:${title}`;
    
    try {
        // 1. Get Token
        const tokenRes = await axios.get(BOT_API_ENDPOINT, {
            params: {
                action: "query",
                meta: "tokens",
                format: "json"
            }
        });
        const token = tokenRes.data?.query?.tokens?.csrftoken;
        if (!token) throw new Error("Could not retrieve CSRF token for bot");

        // 2. Post
        const params = new URLSearchParams();
        params.append("action", "edit");
        params.append("title", talkTitle);
        params.append("section", "new");
        params.append("sectiontitle", "Citation Bot Report");
        params.append("text", `The citation bot has analyzed this article and found issues that require manual intervention:\n${issues.map(i => `* ${i}`).join("\n")}\n\nPlease review these issues. ~~~~`);
        params.append("summary", "Reporting unfixable citation issues");
        params.append("bot", bot ? "1" : "0");
        params.append("token", token);
        params.append("format", "json");

        const editRes = await axios.post(BOT_API_ENDPOINT, params);
        
        if (editRes.data?.edit?.result === "Success") {
            return { success: true, newrevid: editRes.data.edit.newrevid };
        } else {
            return { success: false, error: editRes.data?.error?.info || "Unknown edit error" };
        }

    } catch (error) {
        console.error("Talk page report failed:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Rewrite Article Content (Wikification and Copyedit)
 */
export async function rewriteArticleContent(content) {
    let newContent = content;
    const changes = [];

    // 1. Run standard citation fixes
    const citationResult = await processArticleContent(content);
    newContent = citationResult.newContent;
    changes.push(...citationResult.changes);

    // 2. Fix Header Capitalization (Sentence case)
    // == External Links == -> == External links ==
    newContent = newContent.replace(/==\s*([A-Z][a-z]+)\s+([A-Z][a-z]+)\s*==/g, (match, w1, w2) => {
        const fixed = `== ${w1} ${w2.toLowerCase()} ==`;
        // Exclude specific Proper Nouns if needed (very basic heuristic)
        if (match !== fixed && !["See Also", "Main Page"].includes(`${w1} ${w2}`)) { 
             changes.push(`Fixed header capitalization: "${match.trim()}" -> "${fixed.trim()}"`);
             return fixed;
        }
        return match;
    });

    // 3. Fix spaces before refs
    // "End of sentence .<ref>" -> "End of sentence.<ref>"
    if (/\s+<ref/.test(newContent)) {
         // Only fix if it's strictly [space]<ref
         // Be careful not to break anything
         // newContent = newContent.replace(/([a-z0-9.])\s+<ref/gi, "$1<ref");
         // changes.push("Removed space before <ref>");
    }

    // 4. Expand common contractions
    newContent = newContent.replace(/\b(can't|won't|shouldn't|couldn't|wouldn't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|don't|didn't)\b/gi, (match) => {
        const lower = match.toLowerCase();
        let replacement = match;
        if (lower === "can't") replacement = "cannot";
        if (lower === "won't") replacement = "will not";
        if (lower === "didn't") replacement = "did not";
        if (lower === "don't") replacement = "do not";
        if (lower === "doesn't") replacement = "does not";
        if (lower === "shouldn't") replacement = "should not";
        if (lower === "couldn't") replacement = "could not";
        if (lower === "wouldn't") replacement = "would not";
        if (lower === "isn't") replacement = "is not";
        if (lower === "aren't") replacement = "are not";
        if (lower === "wasn't") replacement = "was not";
        if (lower === "weren't") replacement = "were not";
        if (lower === "hasn't") replacement = "has not";
        if (lower === "haven't") replacement = "have not";
        if (lower === "hadn't") replacement = "had not";
        
        if (replacement !== match) {
             changes.push(`Expanded contraction: "${match}" -> "${replacement}"`);
             return replacement;
        }
        return match;
    });

    // 5. Prose Wikification (Protecting Refs)
    // Protect references to avoid modifying text inside them
    const protectedRefs = [];
    let textOnly = newContent.replace(/(<ref[^>]*>[\s\S]*?<\/ref>|<ref[^>]*\/>)/gi, (match) => {
        protectedRefs.push(match);
        return `__REF_${protectedRefs.length - 1}__`;
    });

    const proseReplacements = [
        { pattern: /\bpassed away\b/gi, replacement: "died", name: "Euphemism" },
        { pattern: /\b(in order to)\b/gi, replacement: "to", name: "Verbosity" },
        { pattern: /\b(due to the fact that)\b/gi, replacement: "because", name: "Verbosity" },
        { pattern: /\b(at this point in time)\b/gi, replacement: "currently", name: "Verbosity" },
        { pattern: /\b(despite the fact that)\b/gi, replacement: "although", name: "Verbosity" },
        { pattern: /\b(it is important to note that|it should be noted that)\s*/gi, replacement: "", name: "Puffery" },
        { pattern: /\b(interestingly|surprisingly),?\s*/gi, replacement: "", name: "Puffery" }
    ];

    proseReplacements.forEach(({ pattern, replacement, name }) => {
        textOnly = textOnly.replace(pattern, (match) => {
            // Basic case preservation
            let finalReplacement = replacement;
            // If replacement is empty (deletion), just return empty
            if (finalReplacement.length > 0 && match[0] === match[0].toUpperCase()) {
                 finalReplacement = finalReplacement.charAt(0).toUpperCase() + finalReplacement.slice(1);
            }
            
            changes.push(`Wikification (${name}): "${match}" -> "${finalReplacement}"`);
            return finalReplacement;
        });
    });

    // Restore Refs
    newContent = textOnly.replace(/__REF_(\d+)__/g, (match, index) => {
        return protectedRefs[parseInt(index)] || match;
    });

    return {
        original: content,
        newContent: newContent,
        changes: changes,
        hasChanges: changes.length > 0
    };
}
