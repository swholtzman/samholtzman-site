import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// store file.txt alongside server code (one level up from routes/)
const DATA_DIR = path.join(__dirname, "..");

function send(res, status, content, type = "text/html") {
    res.writeHead(status, { "Content-Type": type });
    res.end(content);
}

export async function writeFileHandler(url, res) {
    const text = url.searchParams.get("text");
    if (!text) {
        return send(res, 400, "400 Bad Request - Missing 'text' query parameter", "text/plain");
    }

    const filePath = path.join(DATA_DIR, "file.txt");
    await fs.appendFile(filePath, text + "\n", "utf8");
    return send(res, 200, `<b style="color: blue">Appended "${text}" to file.txt</b>`);
}