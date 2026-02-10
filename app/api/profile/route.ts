import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fid, username, pfp, city, talents, address } = body;

    if (!fid) {
      return NextResponse.json({ error: "FID not detected" }, { status: 400 });
    }

  
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        fid: fid,
        username: username,
        avatar_url: pfp,
        city: city,
        bio: talents,
        wallet_address: address,
      }, { onConflict: 'fid' });

    if (dbError) {
      console.error("Supabase Error:", dbError);
      return NextResponse.json({ error: "Database save failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}