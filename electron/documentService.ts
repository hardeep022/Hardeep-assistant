import fs from "node:fs";
import path from "node:path";

export interface DocumentAnalysisResult {
  filePath: string;
  fileName: string;
  fileType: string;
  text: string;
  stats?: {
    rowCount?: number;
    colCount?: number;
    headers?: string[];
    sampleData?: Record<string, any>[];
  };
}

export function parseDocumentFile(filePath: string): DocumentAnalysisResult {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  if (stat.size > 20_000_000) {
    throw new Error("File exceeds maximum supported size (20MB)");
  }

  if (ext === ".csv" || ext === ".tsv") {
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const delimiter = ext === ".tsv" ? "\t" : ",";
    const headers = lines[0]?.split(delimiter).map(h => h.trim().replace(/^"|"$/g, "")) || [];
    const sampleRows = lines.slice(1, 10).map(line => {
      const vals = line.split(delimiter);
      const rowObj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = vals[idx]?.trim().replace(/^"|"$/g, "") || "";
      });
      return rowObj;
    });

    return {
      filePath,
      fileName,
      fileType: "CSV Data Table",
      text: raw.slice(0, 15000),
      stats: {
        rowCount: lines.length - 1,
        colCount: headers.length,
        headers,
        sampleData: sampleRows,
      },
    };
  }

  if (ext === ".json") {
    const raw = fs.readFileSync(filePath, "utf8");
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {}

    const isArray = Array.isArray(parsed);
    return {
      filePath,
      fileName,
      fileType: "JSON Document",
      text: raw.slice(0, 15000),
      stats: isArray ? {
        rowCount: parsed.length,
        colCount: typeof parsed[0] === "object" ? Object.keys(parsed[0] || {}).length : 1,
        headers: typeof parsed[0] === "object" ? Object.keys(parsed[0] || {}) : [],
        sampleData: parsed.slice(0, 5),
      } : undefined,
    };
  }

  // Text, Markdown, Source Code files
  const text = fs.readFileSync(filePath, "utf8");
  return {
    filePath,
    fileName,
    fileType: ext.toUpperCase().replace(".", "") || "Text File",
    text: text.slice(0, 30000),
  };
}
