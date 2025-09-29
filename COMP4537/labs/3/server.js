"use strict";
import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import getDate from "./modules/utils.js";       // returns a Date()      (your file)
import greeting from "./lang/en/en.js";         // returns blue <b> html (your file)

const HOST = "127.0.0.1";
const PORT = parseInt(process.env.PORT || "3003", 10);

// Resolve a safe data directory (same folder as server.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = __dirname; // file.txt will live here

function send(res, status, content, type = "text/html") {
    res.writeHead(status, { "Content-Type": type });
    res.end(content);
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    try {
        // PART B — greet endpoint (accept both "/" and "/getDate/")
        if (pathname === "/" || pathname === "/getDate/") {
            const name = url.searchParams.get("name") || url.searchParams.get("username") || "Friend";
            const now = getDate();
            return send(res, 200, greeting(name, now));
        }

        // PART C.1 — append text to file: /writeFile/?text=BCIT
        if (pathname === "/writeFile/") {
            const text = url.searchParams.get("text");
            if (!text) return send(res, 400, "Missing ?text=...", "text/plain");

            const filePath = path.join(DATA_DIR, "file.txt");
            await fs.appendFile(filePath, text + "\n", "utf8"); // creates if not exists
            return send(res, 200, `<b style="color: blue">Appended "${text}" to file.txt</b>`);
        }

        // PART C.2 — read a file: /readFile/file.txt
        if (pathname.startsWith("/readFile/")) {
            const raw = pathname.slice("/readFile/".length);
            const safe = path.basename(raw);                  // prevent path traversal
            const filePath = path.join(DATA_DIR, safe);

            try {
                const contents = await fs.readFile(filePath, "utf8");
                return send(res, 200, contents, "text/plain; charset=utf-8"); // display in browser
            } catch (err) {
                if (err.code === "ENOENT") {
                    return send(res, 404, `404 Not Found: ${safe}`, "text/plain");
                }
                throw err;
            }
        }

        // Anything else = 404
        return send(res, 404, "404 Not Found", "text/plain");
    } catch (err) {
        console.error(err);
        return send(res, 500, "500 Internal Server Error", "text/plain");
    }
});

server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}/`);
});
