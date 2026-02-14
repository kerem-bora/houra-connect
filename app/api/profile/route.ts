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
  address: z.string().min(1),
  token: z.string().optional(), 
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Veri Formatı Kontrolü
    const validation = ProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Format hatası" }, { status: 400 });
    }

    const { fid, username, city, talents, address } = validation.data;

    // 2. GÜVENLİK KONTROLÜ (KRİTİK)
    // Client'tan gelen x-farcaster-fid header'ı ile body içindeki fid tutmalı.
    const headerFid = req.headers.get("x-farcaster-fid");
    if (!headerFid || Number(headerFid) !== fid) {
      return NextResponse.json({ error: "Kimlik doğrulanamadı (FID mismatch)" }, { status: 401 });
    }

    // 3. Veritabanına Yazma
    // SQL Injection riski yok çünkü parametrik upsert kullanıyoruz.
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        fid: fid,
        username: username,
        city: city || "Global",
        bio: talents || "",
        wallet_address: address, 
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
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    return NextResponse.json({ 
      profile: data ? { ...data, talents: data.bio } : null 
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Veri çekilemedi" }, { status: 500 });
  }
}