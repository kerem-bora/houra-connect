import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ProfileSchema = z.object({
  fid: z.number(),
  username: z.string().min(1).trim(),
  pfp: z.string().optional().nullable(),
  city: z
    .string()
    .optional()
    .nullable()
    .transform(val => val?.trim().replace(/<[^>]*>/g, "") || null),
  talents: z
    .string()
    .optional()
    .nullable()
    .transform(val => val?.trim().replace(/<[^>]*>/g, "") || null),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/), // Cüzdan formatı doğrulaması
  token: z.string().optional(), 
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Veri Formatı Kontrolü
    const validation = ProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Geçersiz veri formatı" }, { status: 400 });
    }

    const { fid, username, city, talents, address } = validation.data;

    // 2. GÜVENLİK KONTROLÜ (FID Eşleşmesi)
    const headerFid = req.headers.get("x-farcaster-fid");
    if (!headerFid || Number(headerFid) !== fid) {
      return NextResponse.json({ error: "Kimlik doğrulanmadı (FID mismatch)" }, { status: 401 });
    }

    // 3. GÜVENLİK KONTROLÜ (Cüzdan Kilidi)
    // Mevcut bir profil var mı kontrol et
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('fid', fid)
      .maybeSingle();

    // Eğer profil zaten varsa ve gelen cüzdan adresi DB'dekiyle tutmuyorsa işlemi reddet
    if (existingProfile && existingProfile.wallet_address.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ 
        error: "Bu profil başka bir cüzdan adresine kilitli. Yetkisiz erişim!" 
      }, { status: 403 });
    }

    // 4. Veritabanına Yazma (Upsert)
    // wallet_address'i .toLowerCase() ile kaydederek tutarlılık sağlıyoruz
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        fid: fid,
        username: username,
        city: city || "Global",
        bio: talents || "",
        wallet_address: address.toLowerCase(), 
      }, { onConflict: 'fid' });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Profile POST Error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get("fid");
    if (!fid) return NextResponse.json({ error: "FID eksik" }, { status: 400 });

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('fid', Number(fid))
      .maybeSingle(); // single() yerine maybeSingle() hata yönetimini kolaylaştırır

    if (error) throw error;
    
    return NextResponse.json({ 
      profile: data ? { ...data, talents: data.bio } : null 
    });
  } catch (error: any) {
    console.error("Profile GET Error:", error);
    return NextResponse.json({ error: "Veri çekilemedi" }, { status: 500 });
  }
}