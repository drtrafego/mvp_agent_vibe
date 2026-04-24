import { NextRequest } from "next/server";

const AGENT_URL = "https://agentevibe.casaldotrafego.com/webhook";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams({
    "hub.mode": searchParams.get("hub.mode") ?? "",
    "hub.verify_token": searchParams.get("hub.verify_token") ?? "",
    "hub.challenge": searchParams.get("hub.challenge") ?? "",
  });

  const res = await fetch(`${AGENT_URL}?${params}`, { method: "GET" });
  const text = await res.text();
  return new Response(text, { status: res.status });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key.startsWith("x-") || key === "content-type") {
      headers[key] = value;
    }
  });

  const res = await fetch(AGENT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });

  return new Response(null, { status: res.status });
}
