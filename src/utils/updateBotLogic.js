import axios from 'axios';
import { saveEdit as saveEditBase, checkBotStatus as checkBotStatusBase, fetchArticle } from './botLogic';

export const checkBotStatus = checkBotStatusBase;
export const saveEdit = saveEditBase;

const API_ENDPOINT = "/api/justapedia";
const ENWIKI_API = "https://en.wikipedia.org/w/api.php";

/**
 * Fetch a random article from Justapedia that likely has an infobox
 * Optionally filtered by categories and excluding specific titles
 */
export async function fetchRandomInfoboxArticle(categories = [], excludeTitles = []) {
  try {
    let params = {
      action: "query",
      prop: "revisions",
      rvprop: "content",
      format: "json",
    };

    if (categories.length > 0) {
      // Pick a random category from the list to sample from
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];

      // 1. Clean the category name (handle URLs, "Category:" prefix)
      let categoryName = randomCategory;
      if (categoryName.includes("/wiki/")) {
          categoryName = categoryName.split("/wiki/")[1];
      }
      categoryName = decodeURIComponent(categoryName).replace(/^Category:/i, "").replace(/_/g, " ").trim();
      
      // 2. Try Local Category Fetch first (Fastest & Most Accurate)
      console.log(`Fetching local category members for: ${categoryName}`);
      params = {
        ...params,
        generator: "categorymembers",
        gcmtitle: `Category:${categoryName}`,
        gcmtype: "page",
        gcmlimit: 100, // Fetch up to 100 members
        // gcmsort: "random" // random sort is not supported by standard API, we'll pick randomly from results
      };

      try {
          const res = await axios.get(API_ENDPOINT, { params });
          const pages = res.data?.query?.pages;
          
          if (pages) {
             const candidates = Object.values(pages).filter(page => {
                const content = page.revisions?.[0]?.["*"];
                return content && 
                       /{{\s*Infobox/i.test(content) &&
                       !excludeTitles.includes(page.title);
             });

             if (candidates.length > 0) {
                 const randomPage = candidates[Math.floor(Math.random() * candidates.length)];
                 return { title: randomPage.title, content: randomPage.revisions?.[0]?.["*"] };
             }
          }
      } catch (e) {
          console.warn("Local category fetch failed, trying EnWiki fallback...", e);
      }

      // 3. Fallback: Fetch from EnWiki Category (The "Sync" approach)
      console.log(`Falling back to EnWiki category fetch for: ${categoryName}`);
      const enWikiTitles = await fetchEnWikiCategoryMembers(categoryName);
      
      if (enWikiTitles && enWikiTitles.length > 0) {
          // Check which of these exist locally
          // Filter out excluded titles first
          const potentialTitles = enWikiTitles.filter(t => !excludeTitles.includes(t));
          
          if (potentialTitles.length === 0) {
              console.warn("All EnWiki candidates are excluded or visited.");
              return null;
          }

          // We check a larger batch to increase hit rate (up to 100)
          const batchSize = 100;
          const shuffled = potentialTitles.sort(() => 0.5 - Math.random()).slice(0, batchSize); 
          
          try {
              // Batch fetch local articles
              const localRes = await axios.get(API_ENDPOINT, {
                  params: {
                      action: "query",
                      titles: shuffled.join("|"),
                      prop: "revisions",
                      rvprop: "content",
                      format: "json"
                  }
              });
              
              const localPages = localRes.data?.query?.pages;
              if (localPages) {
                  const validPages = Object.values(localPages).filter(p => 
                      !p.missing && p.revisions?.[0]?.["*"] && /{{\s*Infobox/i.test(p.revisions[0]["*"])
                  );
                  
                  if (validPages.length > 0) {
                      const randomPage = validPages[Math.floor(Math.random() * validPages.length)];
                      return { title: randomPage.title, content: randomPage.revisions[0]["*"] };
                  } else {
                      console.warn(`Checked ${shuffled.length} EnWiki titles locally, but none matched or had infoboxes.`);
                  }
              }
          } catch (e) {
              console.error("Error in fallback batch fetch:", e);
          }
      } else {
          console.warn("EnWiki category returned no members.");
      }
      
      return null; // Both failed

    } else {
      // Use generator=search with hastemplate:Infobox to find relevant articles
      // Add a random offset to simulate randomness
      const randomOffset = Math.floor(Math.random() * 100);
      
      params = {
        ...params,
        generator: "search",
        gsrsearch: 'hastemplate:"Infobox"',
        gsrnamespace: 0,
        gsrlimit: 20, // Increased limit to find non-excluded ones
        gsroffset: randomOffset,
        gsrsort: "relevance"
      };

      const res = await axios.get(API_ENDPOINT, { params });
      const pages = res.data?.query?.pages;
      if (!pages) return null;

      // Filter for pages containing {{Infobox and NOT in exclude list
      const candidates = Object.values(pages).filter(page => {
          const content = page.revisions?.[0]?.["*"];
          return content && 
                 /{{\s*Infobox/i.test(content) &&
                 !excludeTitles.includes(page.title);
      });

      if (candidates.length === 0) return null;

      // Pick one
      const randomPage = candidates[Math.floor(Math.random() * candidates.length)];
      const content = randomPage.revisions?.[0]?.["*"];

      return {
          title: randomPage.title,
          content: content
      };
    }

  } catch (error) {
    console.error("Error fetching random infobox article:", error);
    return null;
  }
}


/**
 * Fetch category members from EnWiki
 * Returns an array of titles
 */
async function fetchEnWikiCategoryMembers(categoryName) {
    try {
        const res = await axios.get(ENWIKI_API, {
            params: {
                action: "query",
                list: "categorymembers",
                cmtitle: `Category:${categoryName}`,
                cmlimit: 500, // Fetch up to 500 candidates (max for non-bots)
                cmnamespace: 0, // Articles only
                format: "json",
                origin: "*"
            }
        });

        const members = res.data?.query?.categorymembers;
        if (!members || members.length === 0) return [];

        return members.map(m => m.title);
    } catch (e) {
        console.error("Error fetching EnWiki category members:", e);
        return [];
    }
}

/**
 * Fetch EnWiki content
 */
async function fetchEnWikiContent(title) {
    try {
        const res = await axios.get(ENWIKI_API, {
            params: {
                action: "query",
                titles: title,
                prop: "revisions",
                rvprop: "content",
                format: "json",
                origin: "*" // Enable CORS
            }
        });
        
        const pages = res.data?.query?.pages;
        if (!pages) return null;
        
        const pageId = Object.keys(pages)[0];
        if (pageId === "-1") return null;

        return pages[pageId].revisions?.[0]?.["*"];
    } catch (e) {
        console.error("Error fetching EnWiki content:", e);
        return null;
    }
}

/**
 * Extract Infobox string from content
 */
function extractInfobox(content) {
    if (!content) return null;
    
    // Find {{Infobox ...
    const startRegex = /{{\s*Infobox/i;
    const match = content.match(startRegex);
    if (!match) return null;

    let startIndex = match.index;
    let openCount = 0;
    let endIndex = -1;
    let foundStart = false;

    // Scan from the match index
    for (let i = startIndex; i < content.length; i++) {
        // Check for '{{'
        if (content[i] === '{' && content[i+1] === '{') {
            openCount++;
            i++; // Skip next char
            foundStart = true;
        } 
        // Check for '}}'
        else if (content[i] === '}' && content[i+1] === '}') {
            openCount--;
            i++; // Skip next char
        }

        // If we have started and count returns to 0, we found the end
        if (foundStart && openCount === 0) {
            endIndex = i + 1; // Include the closing braces
            break;
        }
    }

    if (endIndex === -1) return null; // Malformed or incomplete

    return {
        fullText: content.substring(startIndex, endIndex),
        startIndex,
        endIndex
    };
}

/**
 * Compare and Sync Infobox
 */
export async function processInfoboxSync(jpContent, title) {
    const jpInfoboxData = extractInfobox(jpContent);
    if (!jpInfoboxData) {
        return { hasChanges: false, reason: "No Infobox in Justapedia article" };
    }

    // Fetch EnWiki
    const enContent = await fetchEnWikiContent(title);
    if (!enContent) {
        return { hasChanges: false, reason: "Article not found on English Wikipedia" };
    }

    const enInfoboxData = extractInfobox(enContent);
    if (!enInfoboxData) {
        return { hasChanges: false, reason: "No Infobox in English Wikipedia article" };
    }
    
    // Cleanup EnWiki Infobox: Remove placeholder date templates
    let cleanedEnInfobox = enInfoboxData.fullText;
    
    // Remove HTML comments (e.g., <!-- Order per main on-end titles... -->)
    cleanedEnInfobox = cleanedEnInfobox.replace(/<!--[\s\S]*?-->/g, "");

    // Remove {{Death date and age|YYYY|MM|DD...}} and {{Birth date and age|YYYY|MM|DD...}}
    cleanedEnInfobox = cleanedEnInfobox.replace(/\{\{(?:Death|Birth) date and age\s*\|\s*YYYY\s*\|\s*MM\s*\|\s*DD[^}]*\}\}/gi, "");

    // Normalize strings for comparison (ignore whitespace differences)
    const normalize = (str) => str.replace(/\s+/g, ' ').trim();

    if (normalize(jpInfoboxData.fullText) === normalize(cleanedEnInfobox)) {
        // Better feedback if the only difference was comments/dates we stripped
        if (normalize(enInfoboxData.fullText) !== normalize(cleanedEnInfobox)) {
            return { hasChanges: false, reason: "Identical (EnWiki comments/dates skipped)" };
        }
        return { hasChanges: false, reason: "Infoboxes are already identical" };
    }

    // Construct new content: Replace JP infobox with EnWiki infobox
    const newContent = 
        jpContent.substring(0, jpInfoboxData.startIndex) + 
        cleanedEnInfobox + 
        jpContent.substring(jpInfoboxData.endIndex);

    return {
        hasChanges: true,
        newContent,
        changes: ["update infobox"],
        originalInfobox: jpInfoboxData.fullText,
        newInfobox: cleanedEnInfobox
    };
}
