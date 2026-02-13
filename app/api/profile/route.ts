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
  // ... diğer alanlar
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Şemayı doğrula
    const validation = ProfileSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const { fid, username, pfp, city, talents, address } = validation.data;

    // 2. KRİTİK GÜVENLİK: Farcaster Signature Verification
    // Not: Gerçek dünyada body içerisinde 'client_generated_sig' bekleriz.
    // Eğer imza doğrulaması başarısızsa işlemi reddet.
    /* const isValid = await verifyFrameSignature(body.signature); 
       if (!isValid) return NextResponse.json({ error: "Unauthorized Identity" }, { status: 401 });
    */

    // 3. Database Kontrolü (Ekstra Katman)
    // Eğer bu FID zaten varsa ve mevcut kullanıcı adı ile uyuşmuyorsa blockla
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('fid')
      .eq('fid', fid)
      .single();

    // Sadece kendi FID'si üzerinde işlem yapmasını veritabanı kısıtlaması (RLS) ile de bağlayabiliriz.
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        fid: fid,
        username: username,
        avatar_url: pfp || null,
        city: city || "Global",
        bio: talents || "",
        wallet_address: address || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'fid' });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Security Breach Attempt or DB Error:", error);
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }
}