"use strict";
import http from 'http';
import getDate from './modules/utils.js';
import greeting from './lang/en/en.js';

const PORT = parseInt(process.env.PORT || '3003', 10);
const HOST = '127.0.0.1';

const server = http.createServer((req, res) => {
    // use http in the base URL (the request hits us via Nginx over http)
    const url = new URL(req.url, `https://${req.headers.host}`);

    // we’re mounted behind Nginx at /COMP4537/labs/3/, but because your
    // nginx location uses a trailing slash with proxy_pass, the backend
    // sees "/" — keep this check as-is
    if (url.pathname !== '/') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
    }

    // accept ?name=... or ?username=...
    const name = url.searchParams.get('name') || url.searchParams.get('username') || 'Friend';


    const now = getDate(); // server time
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(greeting(name, now));
});

server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}/`);
});
