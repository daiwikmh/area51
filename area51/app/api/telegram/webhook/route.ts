import { redeemToken } from "@/lib/telegram";

// Telegram sends POST to this URL for every message/update
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ ok: true });

  const message = body.message;
  if (!message?.text) return Response.json({ ok: true });

  const chatId = String(message.chat.id);
  const username = message.from?.username as string | undefined;
  const text: string = message.text;

  // /start TOKEN — link wallet to this chat
  if (text.startsWith("/start ")) {
    const token = text.slice(7).trim();
    const wallet = redeemToken(token, chatId, username);

    const replyText = wallet
      ? `Wallet <code>${wallet.slice(0, 6)}...${wallet.slice(-4)}</code> linked. You will receive order and execution updates here.`
      : "Link expired or invalid. Please reconnect from the app.";

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: replyText, parse_mode: "HTML" }),
    }).catch(() => {});
  }

  return Response.json({ ok: true });
}
