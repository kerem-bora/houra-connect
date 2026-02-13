import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Supabase istemcisi
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 1. Şemayı Eksiksiz Tanımlıyoruz (Data kaybını önlemek için)
const ProfileSchema = z.object({
  fid: z.number(),
  username: z.string().min(1),
  pfp: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  talents: z.string().optional().nullable(), // page.tsx'ten 'offer' olarak geliyor
  address: z.string().optional().nullable(),
});

// 2. GET METODU (Uçan bölüm - Veriyi ekrana getiren kısım)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get("fid");

    if (!fid) {
      return NextResponse.json({ error: "FID is missing" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('fid', Number(fid))
      .single();

    if (error && error.code !== 'PGRST116') { 
      throw error;
    }

    // Page.tsx "profile" anahtarı altında veri bekliyor
    return NextResponse.json({ profile: data || null });

  } catch (error: any) {
    console.error("Profile GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 3. POST METODU (Güncellenmiş ve Güvenli)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Şema doğrulaması (Artık tüm alanları tanıyor)
    const validation = ProfileSchema.safeParse(body);
    
    if (!validation.success) {
      console.error("Validation Error:", validation.error.format());
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const { fid, username, pfp, city, talents, address } = validation.data;

    // Database İşlemi (Upsert)
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        fid: fid,
        username: username,
        avatar_url: pfp || null,
        city: city || "Global",
        bio: talents || "",      // Page.tsx talents/bio ikiliğini burada eşitliyoruz
        talents: talents || "",   // Her iki kolonu da doldurmak en güvenlisi
        wallet_address: address || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'fid' });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("DB Error:", error);
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }
}