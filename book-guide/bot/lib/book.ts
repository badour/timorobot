import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractText, getDocumentProxy } from "unpdf";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const MAX_BYTES = 80 * 1024 * 1024;
const EXCERPT_CHARS = 800;
const PAGE_CHARS = 2000;
const MAX_READ_PAGES = 3;

const STOP = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "this",
  "from",
  "what",
  "when",
  "where",
  "who",
  "how",
  "why",
  "does",
  "did",
  "about",
  "into",
  "your",
  "have",
  "was",
  "were",
  "are",
  "you",
  "any",
]);

export type PageText = {
  page: number;
  text: string;
};

export type BookMatch = {
  page: number;
  excerpt: string;
};

export type BookCopy = {
  source: string;
  pages: PageText[];
  warning?: string;
};

export type TextCache = {
  read(path: string): Promise<string | undefined>;
  write(path: string, data: string): Promise<void>;
};

type LoadedPdf = {
  bytes: Uint8Array;
  source: string;
  warning?: string;
};

let memo: { sha: string; copy: BookCopy } | undefined;

function repo(): string {
  return process.env.BOOK_GITHUB_REPO?.trim() || "badour/timorobot";
}

function ref(): string {
  return process.env.BOOK_GITHUB_REF?.trim() || "main";
}

function githubPaths(): string[] {
  const custom = process.env.BOOK_GITHUB_PATH?.trim();
  if (custom) return [custom];
  return ["book.pdf", "book-guide/book.pdf"];
}

function localPaths(): string[] {
  const custom = process.env.BOOK_PDF_PATH?.trim();
  if (custom) return [custom];
  return [
    path.resolve(PROJECT_ROOT, "../book.pdf"),
    path.join(PROJECT_ROOT, "book.pdf"),
  ];
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 1);
}

function countTerm(text: string, term: string): number {
  let count = 0;
  for (const word of tokens(text)) {
    if (word === term) count += 1;
  }
  if (count === 0 && term.length > 4 && text.toLowerCase().includes(term)) {
    return 1;
  }
  return count;
}

function windowAround(text: string, query: string, terms: string[], max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const lower = flat.toLowerCase();
  const needles = [query.toLowerCase().trim(), ...terms].filter((item) => item.length > 2);
  let at = -1;
  for (const needle of needles) {
    const index = lower.indexOf(needle);
    if (index >= 0) {
      at = index;
      break;
    }
  }
  if (at < 0) return `${flat.slice(0, max)}…`;
  const start = Math.max(0, at - 180);
  const end = Math.min(flat.length, start + max);
  const slice = flat.slice(start, end);
  return `${start > 0 ? "…" : ""}${slice}${end < flat.length ? "…" : ""}`;
}

export function searchPages(pages: PageText[], query: string, limit: number): BookMatch[] {
  const phrase = query.trim().toLowerCase();
  const raw = tokens(phrase);
  const useful = raw.filter((word) => !STOP.has(word));
  const terms = useful.length > 0 ? useful : raw;
  if (terms.length === 0) return [];

  const ranked = pages
    .map((page) => {
      const hay = page.text.toLowerCase();
      let score = 0;
      if (phrase.length > 2 && hay.includes(phrase)) score += 12;
      let covered = 0;
      for (const term of terms) {
        const hits = countTerm(page.text, term);
        if (hits > 0) {
          covered += 1;
          score += 1 + Math.min(hits, 5);
        }
      }
      if (covered === terms.length && terms.length > 1) score += 6;
      return {
        page: page.page,
        score,
        excerpt: windowAround(page.text, phrase, terms, EXCERPT_CHARS),
      };
    })
    .filter((row) => row.score > 0);

  ranked.sort((a, b) => b.score - a.score || a.page - b.page);
  return ranked.slice(0, limit).map(({ page, excerpt }) => ({ page, excerpt }));
}

export function readPageRange(
  pages: PageText[],
  startPage: number,
  endPage: number,
): { pages: { page: number; text: string; truncated: boolean }[]; pageCount: number } {
  const last = Math.max(startPage, Math.min(endPage, startPage + MAX_READ_PAGES - 1, pages.length));
  const first = Math.min(Math.max(startPage, 1), pages.length);
  const selected = pages
    .filter((page) => page.page >= first && page.page <= last)
    .map((page) => {
      const flat = page.text.replace(/\s+/g, " ").trim();
      const truncated = flat.length > PAGE_CHARS;
      return {
        page: page.page,
        text: truncated ? `${flat.slice(0, PAGE_CHARS)}…` : flat,
        truncated,
      };
    });
  return { pages: selected, pageCount: pages.length };
}

export function openingLine(pages: PageText[]): string | undefined {
  for (const page of pages) {
    const line = page.text
      .split(/\n/)
      .map((item) => item.trim())
      .find((item) => item.length > 0);
    if (line) return line.slice(0, 160);
  }
  return undefined;
}

function isPdf(bytes: Uint8Array): boolean {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  return head.includes("%PDF-");
}

async function bytesFromResponse(response: Response, filePath: string): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) {
    throw new Error(`${filePath} is larger than 80 MB. Upload a smaller PDF.`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error(`${filePath} is larger than 80 MB. Upload a smaller PDF.`);
  }
  if (!isPdf(bytes)) {
    throw new Error(`GitHub did not return a PDF for ${filePath}.`);
  }
  return bytes;
}

async function fetchGithub(filePath: string): Promise<Uint8Array | undefined> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const encodedRef = ref().split("/").map(encodeURIComponent).join("/");
  const headers = { "User-Agent": "timorobot-book-guide" };

  if (token) {
    const api = `https://api.github.com/repos/${repo()}/contents/${encodedPath}?ref=${encodeURIComponent(ref())}`;
    const apiResponse = await fetch(api, {
      headers: {
        ...headers,
        Accept: "application/vnd.github.raw",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (apiResponse.ok) return bytesFromResponse(apiResponse, filePath);
    if (apiResponse.status !== 401 && apiResponse.status !== 403 && apiResponse.status !== 404) {
      throw new Error(`GitHub returned ${apiResponse.status} while reading ${filePath}.`);
    }
  }

  const raw = `https://raw.githubusercontent.com/${repo()}/${encodedRef}/${encodedPath}`;
  const rawResponse = await fetch(raw, {
    headers,
    signal: AbortSignal.timeout(20_000),
  });
  if (rawResponse.status === 404) return undefined;
  if (!rawResponse.ok) {
    throw new Error(`GitHub returned ${rawResponse.status} while reading ${filePath}.`);
  }
  return bytesFromResponse(rawResponse, filePath);
}

async function fromGithub(): Promise<LoadedPdf | undefined> {
  for (const filePath of githubPaths()) {
    const bytes = await fetchGithub(filePath);
    if (!bytes) continue;
    return { bytes, source: `github:${repo()}/${filePath}@${ref()}` };
  }
  return undefined;
}

async function fromDisk(): Promise<LoadedPdf | undefined> {
  for (const filePath of localPaths()) {
    try {
      const bytes = new Uint8Array(await readFile(filePath));
      if (!isPdf(bytes)) continue;
      return { bytes, source: `local:${path.basename(filePath)}` };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") continue;
      throw error;
    }
  }
  return undefined;
}

async function extractPages(bytes: Uint8Array): Promise<PageText[]> {
  const pdf = await getDocumentProxy(bytes);
  const extracted = await extractText(pdf, { mergePages: false });
  const text = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
  return text.map((page, index) => ({
    page: index + 1,
    text: page.replace(/\s+\n/g, "\n").trim(),
  }));
}

function missingBookError(): Error {
  return new Error(
    `book.pdf is not on GitHub yet. Commit it to ${repo()} on the ${ref()} branch as book.pdf. If that repository is private, set GITHUB_TOKEN where the agent runs.`,
  );
}

export async function loadBook(cache?: TextCache): Promise<BookCopy> {
  let loaded: LoadedPdf | undefined;
  let githubWarning: string | undefined;
  try {
    loaded = await fromGithub();
  } catch (error) {
    githubWarning = error instanceof Error ? error.message : "GitHub could not be reached.";
  }
  if (!loaded) loaded = await fromDisk();
  if (!loaded) throw missingBookError();

  const sha = createHash("sha256").update(loaded.bytes).digest("hex");
  if (memo?.sha === sha) {
    return githubWarning ? { ...memo.copy, source: loaded.source, warning: githubWarning } : { ...memo.copy, source: loaded.source };
  }

  const cachePath = `book-text/${sha}.json`;
  if (cache) {
    try {
      const saved = await cache.read(cachePath);
      if (saved) {
        const parsed = JSON.parse(saved) as { pages?: PageText[] };
        if (Array.isArray(parsed.pages) && parsed.pages.length > 0) {
          const copy = finish(loaded, parsed.pages, githubWarning);
          memo = { sha, copy };
          return copy;
        }
      }
    } catch {
      // A cache miss is fine. The PDF is still read below.
    }
  }

  const pages = await extractPages(loaded.bytes);
  const copy = finish(loaded, pages, githubWarning);
  memo = { sha, copy };
  if (cache && pages.length > 0) {
    try {
      await cache.write(cachePath, JSON.stringify({ pages }));
    } catch {
      // The answer does not depend on the cache write.
    }
  }
  return copy;
}

function finish(loaded: LoadedPdf, pages: PageText[], githubWarning?: string): BookCopy {
  const empty = pages.every((page) => page.text.length === 0);
  const scanWarning = empty
    ? "This PDF has no text layer. It looks like a scan. Run OCR, replace book.pdf on GitHub, and ask again."
    : undefined;
  return {
    source: loaded.source,
    pages,
    warning: scanWarning ?? githubWarning,
  };
}
