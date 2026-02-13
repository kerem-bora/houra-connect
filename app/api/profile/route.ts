import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ProfileSchema = z.object({
  fid: z.number(),
  username: z.string().min(1),
  pfp: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  talents: z.string().optional().nullable(), // Frontend'den gelen alan adı
  address: z.string().min(1),
  signature: z.string().min(1), 
  message: z.string().min(1),  
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get("fid");
    if (!fid) return NextResponse.json({ error: "FID is missing" }, { status: 400 });

    const { data, error } = await supabase
      .from('profiles')
      .select('*') // Tüm sütunları (bio dahil) çekiyoruz
      .eq('fid', Number(fid))
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // Veritabanındaki 'bio' sütunu artık frontend'e 'profile' objesi içinde gidiyor
    return NextResponse.json({ profile: data || null });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = ProfileSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const { fid, username, pfp, city, talents, address } = validation.data;

    // Bypass aktif
    const isValid = true; 

    // Veritabanı İşlemi: talents değerini bio sütununa yazıyoruz
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        fid: fid,
        username: username,
        avatar_url: pfp || null,
        city: city || "Global",
        bio: talents || "", // DB'deki sütun adın 'bio' olduğu için burayı sabitledik
        wallet_address: address || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'fid' });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Profile POST Error:", error);
    // Hata detayını görmek için status 500 ve mesajı dönelim
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}