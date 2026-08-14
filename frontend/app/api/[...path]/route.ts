import { NextResponse, type NextRequest } from "next/server";

// In production the FastAPI backend lives on a different domain (e.g. Render).
// Calling it directly from the browser would make the session cookie a
// third-party cookie, which Chrome and other browsers block by default. This
// route handler proxies every /api/* request through this Next.js server
// instead, so the browser only ever talks to its own origin and the cookie
// is always first-party. (An earlier attempt used next.config.ts `rewrites()`
// for this, but Vercel's rewrite-to-external-origin path did not reliably
// forward POST bodies/cookies — this explicit handler has full control.)
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const targetUrl = new URL(`${BACKEND_ORIGIN}/api/${path.join("/")}`);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const hasBody = !["GET", "HEAD"].includes(request.method);

  const backendResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "follow",
  });

  const responseHeaders = new Headers(backendResponse.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("set-cookie");

  const response = new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });

  for (const cookie of backendResponse.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}

type Params = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: Params) {
  return proxy(request, (await params).path);
}

export async function POST(request: NextRequest, { params }: Params) {
  return proxy(request, (await params).path);
}

export async function PUT(request: NextRequest, { params }: Params) {
  return proxy(request, (await params).path);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return proxy(request, (await params).path);
}