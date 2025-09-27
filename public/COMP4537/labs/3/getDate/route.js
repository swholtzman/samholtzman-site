import greeting from "@/lang/en/en";     // adjust alias or use a relative path
import getDate from "@/modules/utils";    // adjust alias or use a relative path

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "Friend";
  const now = getDate(); // server time

  const html = greeting(name, now); // inline blue styling lives in the lang file
  return new Response(html, { headers: { "content-type": "text/html" } });
}