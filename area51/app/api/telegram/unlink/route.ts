import { unlinkWallet } from "@/lib/telegram";

export async function POST(request: Request) {
  const { wallet } = await request.json();
  if (!wallet) return Response.json({ error: "missing wallet" }, { status: 400 });
  unlinkWallet(wallet);
  return Response.json({ ok: true });
}
