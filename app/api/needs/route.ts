import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- İHTİYAÇLARI LİSTELE (READ) ---
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('needs')
      .select('*')
      .order('created_at', { ascending: false }); // Yeniden eskiye sıralama

    if (error) throw error;

    return NextResponse.json({ needs: data });
  } catch (error: any) {
    console.error("Fetch Needs Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- YENİ İHTİYAÇ EKLE (INSERT) ---
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fid, username, location, text, wallet_address, price } = body; // price eklendi

    if (!fid || !text || !wallet_address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from('needs')
      .insert([
        { 
          fid: fid, 
          username: username, 
          location: location || "Global", 
          text: text,
          wallet_address: wallet_address,
          price: price 
      ]);

    if (dbError) {
      console.error("Supabase Error:", dbError);
      return NextResponse.json({ error: "Failed to post need" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}