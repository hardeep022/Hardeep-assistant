import fs from "node:fs";
import path from "node:path";

export interface CodeSearchHit {
  filePath: string;
  relativePath: string;
  line: number;
  snippet: string;
  score: number;
}

const SEARCHABLE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".py", ".rs", ".java", ".c", ".cpp", ".h", ".cs", ".go", ".css", ".html", ".sql", ".sh", ".yaml", ".yml"
]);

const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".venv", "venv", "dist", "build", "dist-electron", ".next", "coverage"
]);

export function searchCodebase(query: string, rootPath: string, maxResults = 25): CodeSearchHit[] {
  if (!query || !query.trim() || !rootPath || !fs.existsSync(rootPath)) return [];

  const hits: CodeSearchHit[] = [];
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const regexes = terms.map(term => new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));

  function scanDirectory(currentPath: string) {
    if (hits.length >= maxResults * 3) return; // cap total collected candidates

    let entries: string[];
    try {
      entries = fs.readdirSync(currentPath);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry) || entry.startsWith(".")) continue;

      const fullPath = path.join(currentPath, entry);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(entry).toLowerCase();
        if (SEARCHABLE_EXTENSIONS.has(ext) && stat.size < 500_000) {
          searchInFile(fullPath, rootPath);
        }
      }
    }
  }

  function searchInFile(filePath: string, rootDir: string) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch {
      return;
    }

    const lines = content.split("\n");
    const relativePath = path.relative(rootDir, filePath);

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      let matchesCount = 0;

      for (const rx of regexes) {
        if (rx.test(lineText) || rx.test(relativePath)) {
          matchesCount++;
        }
      }

      if (matchesCount > 0) {
        let score = matchesCount * 10;
        // Boost score if match is in filename/filepath
        if (terms.some(t => relativePath.toLowerCase().includes(t))) score += 15;
        // Boost if line contains function/class definition
        if (/\b(function|class|interface|type|export|def|fn)\b/i.test(lineText)) score += 5;

        hits.push({
          filePath,
          relativePath,
          line: i + 1,
          snippet: lineText.trim().slice(0, 200),
          score,
        });

        if (hits.length >= maxResults * 2) break;
      }
    }
  }

  scanDirectory(rootPath);

  // Sort hits by score descending, then by relative path
  hits.sort((a, b) => b.score - a.score || a.relativePath.localeCompare(b.relativePath));
  return hits.slice(0, maxResults);
}
