import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Yeni Şema: Artık signature/message yerine safeContext bekliyoruz
const ProfileSchema = z.object({
  fid: z.number(),
  username: z.string().min(1),
  pfp: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  talents: z.string().optional().nullable(),
  address: z.string().min(1),
  safeContext: z.object({
    user: z.object({
      fid: z.number(),
      username: z.string().optional(),
    })
  }).passthrough() // SDK'dan gelen diğer verileri reddetmemesi için
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get("fid");
    if (!fid) return NextResponse.json({ error: "FID missing" }, { status: 400 });

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('fid', Number(fid))
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    const profileData = data ? {
      ...data,
      talents: data.bio 
    } : null;

    return NextResponse.json({ profile: profileData });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Zod Validasyonu
    const validation = ProfileSchema.safeParse(body);
    if (!validation.success) {
      console.error("Validation Error:", validation.error);
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const { fid, username, city, talents, safeContext } = validation.data;

    // 2. KİMLİK KONTROLÜ (GÜVENLİ YÖNTEM)
    // Client'tan gelen header'ı hala okuyoruz ama asıl kanıt safeContext içinde
    const headerFid = req.headers.get("x-farcaster-fid");

    // Güvenlik Duvarı: 
    // Hem header, hem body, hem de imzalı context içindeki FID'ler birbirini tutmalı.
    if (
      !headerFid || 
      Number(headerFid) !== fid || 
      safeContext.user.fid !== fid
    ) {
      return NextResponse.json({ 
        error: "Identity verification failed. Fraud attempt blocked." 
      }, { status: 403 });
    }

    // 3. Veritabanı İşlemi
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        fid: fid,
        username: username,
        city: city || "Global",
        bio: talents || "",
        // pfp: pfp, // İstersen profil resmini de kaydedebilirsin
      }, { onConflict: 'fid' });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Profile POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}