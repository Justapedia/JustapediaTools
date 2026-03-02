import axios from 'axios';

// --- Helper Functions ---

// Generate a random ref name (e.g., "z431")
export function generateRefName() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const numbers = Math.floor(100 + Math.random() * 900); // 100-999
  return `${letter}${numbers}`;
}

// Sanitize user-provided ref name
export function sanitizeRefName(name) {
  if (!name) return "";
  // Remove spaces and special chars that might break XML/MediaWiki ref
  return name.trim().replace(/[^a-zA-Z0-9\-_]/g, "");
}

// Try to generate a meaningful ref name from citation content
// e.g. "Gillmore-2026" or fallback to random
export function generateRefNameFromCitation(citation) {
  if (!citation) return generateRefName();

  // Try to find author/last name
  // Matches: | last=Name | last1=Name | author=Name
  let author = "";
  const lastMatch = citation.match(/\|\s*(?:last\d?|author\d?)\s*=\s*([^|]+)/i);
  if (lastMatch) {
    // If author is "First Last", take "Last"
    const parts = lastMatch[1].trim().split(" ");
    author = parts[parts.length - 1].replace(/[^a-zA-Z]/g, "");
  }

  // Try to find year/date
  // Matches: | date=YYYY-MM-DD | year=YYYY
  let year = "";
  const dateMatch = citation.match(/\|\s*(?:date|year)\s*=\s*(\d{4})/i);
  if (dateMatch) {
    year = dateMatch[1];
  }

  if (author && year) {
    return `${author}-${year}`;
  }
  
  if (author) {
    return `${author}-${Math.floor(100 + Math.random() * 900)}`;
  }

  return generateRefName();
}

// Identify type of identifier
export function identifyType(input) {
  const trimmed = input.trim();
  // DOI
  if (/^10\.\d{4,}\/.+/.test(trimmed)) return "DOI";
  if (/^(https?:\/\/)?(dx\.)?doi\.org\/10\.\d{4,}\/.+/.test(trimmed)) return "DOI_URL";
  
  // PMID
  if (/^\d{1,8}$/.test(trimmed)) return "PMID"; // 1-8 digits likely PMID
  if (/^PMID:?\s*\d+$/i.test(trimmed)) return "PMID";
  
  // S2CID
  if (/^S2CID:?\s*\d+$/i.test(trimmed)) return "S2CID";
  
  // ISBN (10 or 13)
  // Remove dashes/spaces to check length
  const clean = trimmed.replace(/[- ]/g, "");
  if ((clean.length === 10 || clean.length === 13) && /^\d{9}[\dX]$/.test(clean)) return "ISBN"; // Very rough check, better to let fetchers handle validation
  if (/^ISBN:?\s*[\d-]{10,17}$/i.test(trimmed)) return "ISBN";

  // URLs
  if (trimmed.toLowerCase().includes("amazon.com") || trimmed.toLowerCase().includes("amzn.to")) return "AMAZON_BOOK";
  if (trimmed.toLowerCase().includes("books.google")) return "GOOGLE_BOOKS";
  
  if (/^https?:\/\//.test(trimmed)) return "WEB_URL";
  
  return "UNKNOWN";
}

// Format ISBN-13 with hyphens (Group 0 and 1)
export function formatIsbn(isbn) {
  if (!isbn) return "";
  const clean = isbn.replace(/[- ]/g, "");
  if (clean.length !== 13) return isbn; 

  const prefix = clean.substring(0, 3);
  if (prefix !== "978" && prefix !== "979") return isbn; 

  const groupDigit = clean[3];
  const rest = clean.substring(4);

  let pubLen = 0;

  // Group 0 (English)
  if (groupDigit === "0") {
      const d2 = parseInt(rest.substring(0, 2), 10);
      const d3 = parseInt(rest.substring(0, 3), 10);
      const d4 = parseInt(rest.substring(0, 4), 10);
      const d5 = parseInt(rest.substring(0, 5), 10);
      const d6 = parseInt(rest.substring(0, 6), 10);
      const d7 = parseInt(rest.substring(0, 7), 10);

      if (d2 >= 0 && d2 <= 19) pubLen = 2;
      else if (d3 >= 200 && d3 <= 699) pubLen = 3;
      else if (d4 >= 7000 && d4 <= 8499) pubLen = 4;
      else if (d5 >= 85000 && d5 <= 89999) pubLen = 5;
      else if (d6 >= 900000 && d6 <= 949999) pubLen = 6;
      else if (d7 >= 9500000 && d7 <= 9999999) pubLen = 7;
  }
  // Group 1 (English)
  else if (groupDigit === "1") {
      const d2 = parseInt(rest.substring(0, 2), 10);
      const d3 = parseInt(rest.substring(0, 3), 10);
      const d4 = parseInt(rest.substring(0, 4), 10);
      const d5 = parseInt(rest.substring(0, 5), 10);
      const d6 = parseInt(rest.substring(0, 6), 10);

      if (d2 >= 0 && d2 <= 9) pubLen = 2;
      else if (d3 >= 100 && d3 <= 399) pubLen = 3;
      else if (d4 >= 4000 && d4 <= 5499) pubLen = 4;
      else if (d5 >= 55000 && d5 <= 86999) pubLen = 5;
      else if (d6 >= 870000 && d6 <= 999999) pubLen = 6;
  }

  if (pubLen > 0) {
      const pub = rest.substring(0, pubLen);
      const title = rest.substring(pubLen, rest.length - 1);
      const check = rest.substring(rest.length - 1);
      return `${prefix}-${groupDigit}-${pub}-${title}-${check}`;
  }

  return isbn; 
}

// Normalize citation string for Justapedia (ensure dashes in dates, standard ISBNs)
export function normalizeCitationForJustapedia(citation) {
  if (!citation) return "";
  let normalized = citation;

  // 1. Ensure ISBNs have dashes if they look like plain numbers
  // This is hard to do safely on the full string without regex targeting param
  // But we have formatIsbn helper usage inside fetchers, so mostly covered.
  
  // 2. Ensure dates are YYYY-MM-DD if possible (already handled in fetchers usually)
  
  // 3. Remove any double spaces
  normalized = normalized.replace(/\s{2,}/g, " ");
  
  return normalized;
}

// --- Fetcher Functions (Delegated to Server-Side Proxy to avoid CORS) ---

async function fetchViaProxy(identifier, options = {}) {
  try {
    const res = await axios.post('/api/citation', { identifier, ...options });
    if (res.data.error) {
      throw new Error(res.data.error);
    }
    // If format=json, we return the whole response object (which has citation and data)
    if (options.format === "json") {
        return res.data; 
    }
    return res.data.citation;
  } catch (error) {
    console.warn(`[CitationFetcher] Fetch error for ${identifier}: ${error.message}`);
    throw new Error(error.response?.data?.error || "Failed to fetch citation.");
  }
}

export async function fetchFromCrossref(doi, returnData = false) {
  if (returnData) {
      return fetchViaProxy(doi, { format: "json" });
  }
  return fetchViaProxy(doi);
}
// ... (rest)

export async function fetchFromWeb(url, returnData = false) {
  if (returnData) {
      // We need to fix the backend first to actually return the data field
      return fetchViaProxy(url, { format: "json" });
  }
  return fetchViaProxy(url);
}

export async function fetchFromPubMed(pmid) {
  return fetchViaProxy(pmid);
}

export async function fetchFromSemanticScholar(query) {
  return fetchViaProxy(query);
}

export async function fetchFromGoogleBooks(urlOrId) {
  return fetchViaProxy(urlOrId);
}

export async function fetchFromAmazon(urlOrIsbn) {
  return fetchViaProxy(urlOrIsbn);
}


export async function fetchFromArXiv(arxivId, returnData = false) {
  if (returnData) {
      return fetchViaProxy(arxivId, { format: "json" });
  }
  return fetchViaProxy(arxivId);
}

export async function fetchFromPMC(pmcId) {
  return fetchViaProxy(pmcId);
}

export async function fetchFromADS(bibcode) {
   // ADS is not yet implemented in backend, but we can route it anyway to handle the error there
   return fetchViaProxy(bibcode);
}
