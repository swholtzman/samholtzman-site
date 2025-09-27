import greeting from "./lang/en/en.js";
import getDate from "./modules/utils.js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "Friend";
  const now = getDate(); // server time

  const html = greeting(name, now); // inline blue styling is inside greeting()
  return new Response(html, { headers: { "content-type": "text/html" } });
}