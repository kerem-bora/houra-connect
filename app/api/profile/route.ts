import { NextResponse } from "next/server";
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import { createClient } from "@supabase/supabase-js";

const config = new Configuration({ apiKey: process.env.NEYNAR_API_KEY! });
const client = new NeynarAPIClient(config);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // frontend'den gelen verileri senin tablo kolonlarına eşliyoruz
    const { message, signature, nonce, fid, city, talents, username, pfp, address } = body;

    // 1. Neynar Doğrulaması
    const verification = await client.verifySignInMessage({
      message,
      signature,
      nonce
    });

    if (!verification.success || verification.fid !== fid) {
      return NextResponse.json({ error: "Invalid identity signature" }, { status: 401 });
    }

    // 2. Supabase Kayıt (Senin kolon isimlerinle)
    const { data, error: dbError } = await supabase
      .from('profiles')
      .upsert({
        fid: fid,
        username: username,
        avatar_url: pfp,        // pfp -> avatar_url
        city: city,
        bio: talents,          // talents -> bio
        wallet_address: address, // address -> wallet_address
      }, { onConflict: 'fid' });

    if (dbError) {
      console.error("Supabase Error:", dbError);
      return NextResponse.json({ error: "Database save failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Server verification error" }, { status: 500 });
  }
}
