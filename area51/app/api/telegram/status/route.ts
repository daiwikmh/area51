import { getLink } from "@/lib/telegram";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) return Response.json({ linked: false });

  const link = getLink(wallet);
  return Response.json({
    linked: link !== null,
    username: link?.username ?? null,
  });
}
