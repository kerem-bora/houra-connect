import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { SessionData, sessionOptions } from "@/lib/session";

export async function POST(req: Request) {
  const { address, message, signature } = await req.json();

  // İmzayı doğrula
  const client = createPublicClient({ chain: base, transport: http() });
  const valid = await client.verifyMessage({ address, message, signature });

  if (!valid) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Session'a yaz
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.address = address.toLowerCase();
  session.isLoggedIn = true;
  await session.save();

  return Response.json({ success: true });
}

export async function DELETE() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.destroy();
  return Response.json({ success: true });
}