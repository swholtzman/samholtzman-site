import getDate from "../modules/utils.js";
import greeting from "../lang/en/en.js";

function send(res, status, content, type = "text/html") {
    res.writeHead(status, { "Content-Type": type });
    res.end(content);
}

export function getDateHandler(url, res) {
    const name = url.searchParams.get("name") || url.searchParams.get("username") || "Friend";
    const now = getDate();
    return send(res, 200, greeting(name, now));
}