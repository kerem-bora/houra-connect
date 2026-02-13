import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { verifyMessage } from "viem"; // Doğrulama için viem ekledik

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 1. Şemaya İmza Alanlarını Ekledik
const ProfileSchema = z.object({
  fid: z.number(),
  username: z.string().min(1),
  pfp: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  talents: z.string().optional().nullable(),
  address: z.string().min(1), // İmza kontrolü için adres artık zorunlu
  signature: z.string().min(1), // Client'tan gelen imza
  message: z.string().min(1),   // İmzalanan ham mesaj
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get("fid");
    if (!fid) return NextResponse.json({ error: "FID is missing" }, { status: 400 });

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('fid', Number(fid))
      .single();

    if (error && error.code !== 'PGRST116') throw error;
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

    const { fid, username, pfp, city, talents, address, signature, message } = validation.data;

    // --- KRİTİK GÜVENLİK KONTROLÜ (SIGNATURE VERIFICATION) ---
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message: message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      console.error(`Unauthorized attempt for FID: ${fid}`);
      return NextResponse.json({ error: "Signature verification failed!" }, { status: 401 });
    }
    // --------------------------------------------------------

    // Veritabanı İşlemi (Sadece imza geçerliyse çalışır)
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        fid: fid,
        username: username,
        avatar_url: pfp || null,
        city: city || "Global",
        bio: talents || "",
        talents: talents || "",
        wallet_address: address || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'fid' });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Profile POST Error:", error);
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }
}