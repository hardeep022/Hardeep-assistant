export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function performWebSearch(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  if (!query || !query.trim()) return [];

  try {
    const encoded = encodeURIComponent(query);
    // Use DuckDuckGo HTML endpoint as clean local-first search provider
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const results: WebSearchResult[] = [];
    const linkRegex = /<a class="result__url" href="([^"]+)".*?>\s*(.*?)\s*<\/a>[\s\S]*?<a class="result__snippet[^"]*"[^>]*>\s*(.*?)\s*<\/a>/gi;

    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(html)) !== null && results.length < maxResults) {
      let rawUrl = match[1];
      if (rawUrl.includes("uddg=")) {
        const parts = rawUrl.split("uddg=");
        rawUrl = decodeURIComponent(parts[1]?.split("&")[0] || rawUrl);
      }
      const title = match[2].replace(/<[^>]+>/g, "").trim();
      const snippet = match[3].replace(/<[^>]+>/g, "").trim();

      if (title && rawUrl.startsWith("http")) {
        results.push({ title, url: rawUrl, snippet });
      }
    }

    if (results.length === 0) {
      // Fallback duckduckgo json API
      const jsonRes = await fetch(`https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1`);
      if (jsonRes.ok) {
        const json = await jsonRes.json() as { RelatedTopics?: Array<{ FirstURL?: string; Text?: string }> };
        for (const item of json.RelatedTopics || []) {
          if (item.FirstURL && item.Text && results.length < maxResults) {
            results.push({
              title: item.Text.slice(0, 60),
              url: item.FirstURL,
              snippet: item.Text,
            });
          }
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}
