"use strict";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..");

function send(res, status, content, type = "text/plain; charset=utf-8") {
    res.writeHead(status, { "Content-Type": type });
    res.end(content);
}

export async function readFileHandler(pathname, res) {
    const raw = pathname.slice("/readFile/".length);
    const safe = path.basename(raw);               // prevent traversal
    const filePath = path.join(DATA_DIR, safe);

    try {
        const contents = await fs.readFile(filePath, "utf8");
        return send(res, 200, contents);
    } catch (err) {
        if (err.code === "ENOENT") {
            return send(res, 404, `404 Not Found: ${safe}`);
        }
        console.error(err);
        return send(res, 500, "500 Internal Server Error");
    }
}
