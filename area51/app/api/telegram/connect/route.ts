import { createLinkToken, getBotUsername, isConfigured } from "@/lib/telegram";

export async function POST(request: Request) {
  if (!isConfigured()) {
    return Response.json({ error: "Telegram bot not configured" }, { status: 503 });
  }
  const { wallet } = await request.json();
  if (!wallet || typeof wallet !== "string") {
    return Response.json({ error: "missing wallet" }, { status: 400 });
  }
  const token = createLinkToken(wallet);
  const deepLink = `https://t.me/${getBotUsername()}?start=${token}`;
  return Response.json({ token, deepLink });
}
