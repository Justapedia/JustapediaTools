export function getJustapediaConfig() {
  const DEFAULT_API_URL = "https://justapedia.org/api.php";
  const DEFAULT_WIKI_ORIGIN = "https://justapedia.org";
  const DEFAULT_PUBLIC_URL = "https://tools.justapedia.org";
  const DEFAULT_USER_AGENT =
    "JPTools/1.0 (tools.justapedia.org; contact: skhsouravhalder@gmail.com)";

  function trimTrailingSlash(value) {
    return value.replace(/\/+$/, "");
  }

  const apiUrl = process.env.JUSTAPEDIA_API_URL || DEFAULT_API_URL;
  const wikiOrigin = trimTrailingSlash(
    process.env.JUSTAPEDIA_WIKI_ORIGIN || DEFAULT_WIKI_ORIGIN,
  );
  const publicUrl = `${trimTrailingSlash(process.env.JPTOOLS_PUBLIC_URL || DEFAULT_PUBLIC_URL)}/`;
  const userAgent = process.env.JPTOOLS_USER_AGENT || DEFAULT_USER_AGENT;

  return {
    apiUrl,
    wikiOrigin,
    publicUrl,
    userAgent,
    isProduction: process.env.NODE_ENV === "production",
  };
}

export function wikiPageUrl(config, title) {
  return `${config.wikiOrigin}/wiki/${encodeURIComponent(title)}`;
}
