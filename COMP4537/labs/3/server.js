"use strict";

import http from 'http';
import { getDateHandler } from "./routes/getDate.js";
import { writeFileHandler } from "./routes/writeFile.js";
import { readFileHandler } from "./routes/readFile.js";

const HOST = "127.0.0.1";
const PORT = parseInt(process.env.PORT || "3003}, 10");

function send(res, status, content, type = "text/html") {
    res.writeHead(status, { "Content-Type": type });
    res.end(content);
};

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const { pathname } = url;

        // Part B
        if (pathname === "/" || pathname === "/getDate/") {
            return getDateHandler(url, res);
        }

        // Part C.1
        if (pathname === "/writeFile/") {
            return writeFileHandler(url, res);
        }

        // Part C.2
        if (pathname.startsWith("/readFile/")) {
            return readFileHandler(url, res);
        }

        // 404 - Not Found
        return send(res, 404, "404 Not Found", "text/plain");

    } catch (err) {
        console.error(err);
        return send(res, 500, "500 Internal Server Error", "text/plain");
    }
});

server.listen(PORT, HOST, () => {
    console.log(`Server is running at http://${HOST}:${PORT}/`);
});