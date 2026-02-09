import { NextResponse } from "next/server";
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

const config = new Configuration({ apiKey: process.env.NEYNAR_API_KEY! });
const client = new NeynarAPIClient(config);

export async function POST(req: Request) {
  const body = await req.json();
  const { message, signature, nonce, fid, city, talents } = body;

  try {
    // 1. Verify SIWF signature with Neynar
    const verification = await client.verifySignInMessage({
      message,
      signature,
      nonce
    });

    if (!verification.success |

| verification.fid!== fid) {
      return NextResponse.json({ error: "Invalid identity signature" }, { status: 401 });
    }

    // 2. Signature is valid! Now save to your database (Supabase/Postgres)
    console.log(`Saving Profile: FID ${fid}, City: ${city}, Talents: ${talents}`);
    
    // Example DB operation:
    // await db.profile.upsert({ where: { fid }, create: { fid, city, talents }, update: { city, talents } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server verification error" }, { status: 500 });
  }
}
