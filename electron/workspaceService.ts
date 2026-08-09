import fs from "node:fs";
import path from "node:path";
import { dialog } from "electron";

export interface WorkspaceTreeItem {
  name: string;
  path: string;
  relativePath: string;
  isDir: boolean;
  children?: WorkspaceTreeItem[];
  size?: number;
}

export interface ProjectMetadata {
  name: string;
  rootPath: string;
  languages: string[];
  frameworks: string[];
  dependencies: Record<string, string>;
  packageManager: string;
  testFramework?: string;
  hasGit: boolean;
  instructions?: string;
}

export interface DiffHunkLine {
  type: 'add' | 'delete' | 'normal';
  lineNoOld?: number;
  lineNoNew?: number;
  text: string;
}

export interface FileDiff {
  filePath: string;
  relativePath: string;
  oldContent: string;
  newContent: string;
  diffHunks: DiffHunkLine[];
}

const DEFAULT_IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".venv",
  "venv",
  "dist",
  "build",
  "out",
  "dist-electron",
  ".next",
  "coverage",
  "__pycache__",
  ".cache",
]);

function readIgnoreRules(rootPath: string): Set<string> {
  const ignored = new Set(DEFAULT_IGNORED_DIRS);
  const gitignorePath = path.join(rootPath, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    try {
      const content = fs.readFileSync(gitignorePath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const clean = trimmed.replace(/^\/+|\/+$/g, "");
          if (clean) ignored.add(clean);
        }
      }
    } catch {}
  }
  return ignored;
}

export async function selectWorkspaceDirectory(): Promise<{ success: boolean; path?: string; canceled?: boolean }> {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select Workspace Folder for Nova",
  });
  if (result.canceled || !result.filePaths.length) {
    return { success: false, canceled: true };
  }
  return { success: true, path: result.filePaths[0] };
}

export function buildWorkspaceTree(rootPath: string, maxDepth = 6): { tree: WorkspaceTreeItem; metadata: ProjectMetadata } {
  const ignored = readIgnoreRules(rootPath);

  function scanDir(currentPath: string, depth: number): WorkspaceTreeItem {
    const name = path.basename(currentPath) || currentPath;
    const relativePath = path.relative(rootPath, currentPath) || ".";

    let stat: fs.Stats;
    try {
      stat = fs.statSync(currentPath);
    } catch {
      return { name, path: currentPath, relativePath, isDir: false };
    }

    if (!stat.isDirectory()) {
      return { name, path: currentPath, relativePath, isDir: false, size: stat.size };
    }

    const children: WorkspaceTreeItem[] = [];
    if (depth <= maxDepth) {
      try {
        const entries = fs.readdirSync(currentPath);
        for (const entry of entries) {
          if (ignored.has(entry) || entry.startsWith(".git")) continue;
          const fullChildPath = path.join(currentPath, entry);
          children.push(scanDir(fullChildPath, depth + 1));
        }
      } catch {}
    }

    // Sort folders first, then files alphabetically
    children.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    return { name, path: currentPath, relativePath, isDir: true, children };
  }

  const tree = scanDir(rootPath, 1);
  const metadata = extractProjectMetadata(rootPath);
  return { tree, metadata };
}

export function extractProjectMetadata(rootPath: string): ProjectMetadata {
  const name = path.basename(rootPath);
  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const dependencies: Record<string, string> = {};
  let packageManager = "npm";
  let testFramework: string | undefined = undefined;
  const hasGit = fs.existsSync(path.join(rootPath, ".git"));

  // Check Node package.json
  const pkgPath = path.join(rootPath, "package.json");
  if (fs.existsSync(pkgPath)) {
    languages.add("JavaScript / TypeScript");
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      Object.assign(dependencies, allDeps);

      if (allDeps.react) frameworks.add("React");
      if (allDeps.next) frameworks.add("Next.js");
      if (allDeps.vue) frameworks.add("Vue");
      if (allDeps.electron) frameworks.add("Electron");
      if (allDeps.express) frameworks.add("Express");
      if (allDeps.vite) frameworks.add("Vite");
      if (allDeps.tailwindcss) frameworks.add("TailwindCSS");

      if (allDeps.jest || pkg.scripts?.test?.includes("jest")) testFramework = "Jest";
      else if (allDeps.vitest || pkg.scripts?.test?.includes("vitest")) testFramework = "Vitest";
      else if (pkg.scripts?.test) testFramework = "npm test";

      if (fs.existsSync(path.join(rootPath, "pnpm-lock.yaml"))) packageManager = "pnpm";
      else if (fs.existsSync(path.join(rootPath, "yarn.lock"))) packageManager = "yarn";
      else if (fs.existsSync(path.join(rootPath, "bun.lockb"))) packageManager = "bun";
    } catch {}
  }

  // Check Python
  if (fs.existsSync(path.join(rootPath, "pyproject.toml")) || fs.existsSync(path.join(rootPath, "requirements.txt"))) {
    languages.add("Python");
    packageManager = "pip";
    if (fs.existsSync(path.join(rootPath, "pytest.ini")) || fs.existsSync(path.join(rootPath, "tests"))) {
      testFramework = "Pytest";
    }
  }

  // Check Rust
  if (fs.existsSync(path.join(rootPath, "Cargo.toml"))) {
    languages.add("Rust");
    packageManager = "cargo";
    testFramework = "cargo test";
  }

  // Check custom instruction files
  let instructions: string | undefined = undefined;
  const instructionCandidates = [".novarules", "AGENTS.md", "NOVA.md", "README.md"];
  for (const filename of instructionCandidates) {
    const target = path.join(rootPath, filename);
    if (fs.existsSync(target)) {
      try {
        const text = fs.readFileSync(target, "utf8");
        instructions = `[Instruction File: ${filename}]\n${text.slice(0, 3000)}`;
        break;
      } catch {}
    }
  }

  return {
    name,
    rootPath,
    languages: Array.from(languages),
    frameworks: Array.from(frameworks),
    dependencies,
    packageManager,
    testFramework,
    hasGit,
    instructions,
  };
}

export function computeFileDiff(filePath: string, oldContent: string, newContent: string): FileDiff {
  const oldLines = oldContent.split(/\r?\n/);
  const newLines = newContent.split(/\r?\n/);
  const diffHunks: DiffHunkLine[] = [];

  let oldIdx = 0;
  let newIdx = 0;


  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldLines[oldIdx];
    const newLine = newLines[newIdx];

    if (oldLine === newLine) {
      if (oldLine !== undefined) {
        diffHunks.push({ type: "normal", lineNoOld: oldIdx + 1, lineNoNew: newIdx + 1, text: oldLine });
      }
      oldIdx++;
      newIdx++;
    } else {
      if (oldLine !== undefined && (newLine === undefined || !newLines.includes(oldLine, newIdx))) {
        diffHunks.push({ type: "delete", lineNoOld: oldIdx + 1, text: oldLine });
        oldIdx++;
      } else if (newLine !== undefined) {
        diffHunks.push({ type: "add", lineNoNew: newIdx + 1, text: newLine });
        newIdx++;
      } else {
        oldIdx++;
        newIdx++;
      }
    }
    if (diffHunks.length > 500) break; // cap long diffs
  }

  return {
    filePath,
    relativePath: path.basename(filePath),
    oldContent,
    newContent,
    diffHunks,
  };
}
