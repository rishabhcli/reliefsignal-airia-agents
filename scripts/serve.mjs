import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const targetDir = path.resolve(rootDir, process.argv[2] ?? "app");
const port = Number(process.argv[3] ?? 3000);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function resolveRequestPath(urlPathname) {
  const cleanPath = decodeURIComponent(urlPathname.split("?")[0]);
  const normalized = cleanPath === "/" ? "/index.html" : cleanPath;
  const requestedPath = path.normalize(path.join(targetDir, normalized));

  if (!requestedPath.startsWith(targetDir)) {
    return null;
  }

  return requestedPath;
}

const server = http.createServer(async (request, response) => {
  const requestedPath = resolveRequestPath(request.url ?? "/");

  if (!requestedPath) {
    response.writeHead(403, { "Content-Type": MIME_TYPES[".txt"] });
    response.end("Forbidden");
    return;
  }

  let filePath = requestedPath;

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch {
    if (!path.extname(filePath)) {
      filePath = path.join(targetDir, "index.html");
    }
  }

  try {
    await access(filePath);
    const extname = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extname] ?? "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": MIME_TYPES[".txt"] });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${path.relative(rootDir, targetDir) || "."} at http://127.0.0.1:${port}`);
});
