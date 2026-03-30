// in-memory store — survives across requests within one process, resets on restart
const pendingTokens = new Map<string, { wallet: string; expires: number }>();
const linkedChats = new Map<string, { chatId: string; username?: string }>();   // wallet → chat
const chatToWallet = new Map<string, string>();                                  // chatId → wallet

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? "";
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export function getBotUsername() {
  return BOT_USERNAME;
}

export function isConfigured() {
  return BOT_TOKEN.length > 0 && BOT_USERNAME.length > 0;
}

// generate a short random token
export function createLinkToken(wallet: string): string {
  const token = Math.random().toString(36).slice(2, 10).toUpperCase();
  pendingTokens.set(token, { wallet: wallet.toLowerCase(), expires: Date.now() + 10 * 60 * 1000 });
  return token;
}

// called from webhook when user sends /start TOKEN
export function redeemToken(token: string, chatId: string, username?: string): string | null {
  const entry = pendingTokens.get(token);
  if (!entry || entry.expires < Date.now()) return null;
  pendingTokens.delete(token);

  const wallet = entry.wallet;
  linkedChats.set(wallet, { chatId, username });
  chatToWallet.set(chatId, wallet);
  return wallet;
}

export function getLink(wallet: string) {
  return linkedChats.get(wallet.toLowerCase()) ?? null;
}

export function unlinkWallet(wallet: string) {
  const link = linkedChats.get(wallet.toLowerCase());
  if (link) chatToWallet.delete(link.chatId);
  linkedChats.delete(wallet.toLowerCase());
}

async function sendMessage(chatId: string, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch(() => {});
}

export async function notifyWallet(wallet: string, text: string) {
  const link = linkedChats.get(wallet.toLowerCase());
  if (!link) return;
  await sendMessage(link.chatId, text);
}

export async function broadcastToAll(text: string) {
  for (const [, { chatId }] of linkedChats) {
    await sendMessage(chatId, text);
  }
}
