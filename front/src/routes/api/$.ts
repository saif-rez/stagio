// Production /api proxy: forwards every /api/* request to the Express backend (API_ORIGIN).
// The browser only talks to this site, so the session cookie stays first-party
// (works in Safari and with third-party cookies blocked). In dev, Vite's proxy answers first.
import { createFileRoute } from "@tanstack/react-router";

// Hop-by-hop or recomputed headers that must not be forwarded as-is.
const DROP_REQUEST = [
  "host",
  "connection",
  "content-length",
  "x-forwarded-for",
  "x-forwarded-host",
];
const DROP_RESPONSE = ["connection", "content-encoding", "content-length", "transfer-encoding"];

/** Visitor IP as set by the hosting platform (Vercel overwrites these headers). */
function clientIp(request: Request) {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ""
  );
}

async function proxy({ request }: { request: Request }) {
  const origin = process.env["API_ORIGIN"];
  if (!origin) {
    return Response.json(
      { error: { code: "API_NOT_CONFIGURED", message: "API_ORIGIN n’est pas configuré." } },
      { status: 503 },
    );
  }
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, origin);

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!DROP_REQUEST.includes(key.toLowerCase())) headers.set(key, value);
  });
  const ip = clientIp(request);
  if (ip) headers.set("x-forwarded-for", ip);
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let res: Response;
  try {
    res = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : null,
      redirect: "manual",
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "API_UNREACHABLE",
          message: "Le serveur démarre, réessayez dans quelques secondes.",
        },
      },
      { status: 502 },
    );
  }

  const out = new Headers();
  res.headers.forEach((value, key) => {
    if (!DROP_RESPONSE.includes(key) && key !== "set-cookie") out.set(key, value);
  });
  // Several Set-Cookie headers must be kept separate.
  for (const cookie of res.headers.getSetCookie()) out.append("set-cookie", cookie);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}

export const Route = createFileRoute("/api/$")({
  server: { handlers: { ANY: proxy } },
});
