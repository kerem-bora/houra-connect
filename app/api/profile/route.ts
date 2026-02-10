import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- PROFİL GETİRME (READ) ---
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get('fid');

    if (!fid) {
      return NextResponse.json({ error: "FID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('city, bio') // talents alanını bio olarak çekiyoruz
      .eq('fid', fid)
      .single();

    // Eğer kayıt yoksa hata dönmek yerine boş veri dönelim ki form boş kalsın
    if (error && error.code === 'PGRST116') {
      return NextResponse.json({ profile: { city: "", bio: "" } });
    }

    if (error) throw error;

    return NextResponse.json({ profile: data });
  } catch (error: any) {
    console.error("Fetch Profile Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- PROFİL GÜNCELLEME (UPSERT) ---
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