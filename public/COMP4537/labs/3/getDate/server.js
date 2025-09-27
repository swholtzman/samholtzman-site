"use strict";
import http from 'http';
import getDate from './modules/utils.js';
import greeting from './lang/en/en.js';

const port = 3000;

const server = http.createServer((req, res) => {
    // parse query
    const url = new URL(req.url, `https://${req.headers.host}`);
    if (url.pathname !== '/') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
    }
    const username = url.searchParams.get('username') || 'Friend';

    // server-side values
    const currentDate = getDate();
    // const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // return html; inline styling can work
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(greeting(username, currentDate));
}
).listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
}
);
