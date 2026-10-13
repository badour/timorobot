import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 8080);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function resolveFile(pathname) {
  let base = join(root, "public");
  let rel = pathname;
  if (pathname.startsWith("/src/")) {
    base = join(root, "src");
    rel = pathname.slice(4);
  } else if (pathname.startsWith("/content/")) {
    base = join(root, "content");
    rel = pathname.slice(8);
  }
  if (rel === "/" || rel === "") rel = "/index.html";
  rel = decodeURIComponent(rel).replace(/^[/\\]+/, "");
  if (rel.includes("\0")) return null;
  const full = join(base, rel);
  if (full !== base && !full.startsWith(base + sep)) return null;
  return full;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    const file = resolveFile(url.pathname);
    if (!file) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`University reception kiosk at http://localhost:${port}`);
});
