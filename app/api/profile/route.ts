import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { decodeJwt } from "jose";
import { verifyMessage } from "viem";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ProfileSchema = z.object({
  fid: z.number(),
  username: z.string().min(1),
  pfp: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  talents: z.string().optional().nullable(),
  address: z.string().min(1),
});

/**
 * Farcaster Auth Token Doğrulama (Manuel Yöntem)
 * Kütüphane kaynaklı 'undefined' hatalarını tamamen baypas eder.
 */
async function verifyFarcasterAuth(req: Request, expectedFid: number) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return false;

    const token = authHeader.split(" ")[1];
    if (!token) return false;

    // 1. JWT Token'ı çöz
    const payload = decodeJwt(token) as any;

    // 2. FID ve Temel Kontroller
    if (!payload || payload.fid !== expectedFid) {
      console.error("Profile Auth: FID mismatch");
      return false;
    }

    // 3. Süre Kontrolü
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      console.error("Profile Auth: Token expired");
      return false;
    }

    // 4. Kriptografik İmza Doğrulaması
    const isVerified = await verifyMessage({
      address: payload.address as `0x${string}`,
      message: payload.message,
      signature: payload.signature as `0x${string}`,
    });

    return isVerified;
  } catch (err) {
    console.error("Profile Auth System Crash:", err);
    return false;
  }
}

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
    
    const validation = ProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const { fid, username, city, talents, address, pfp } = validation.data;

    // MANUEL AUTH DOĞRULAMASI
    const isAuthorized = await verifyFarcasterAuth(req, fid);
    if (!isAuthorized) {
      return NextResponse.json({ 
        error: "Identity verification failed. Unauthorized." 
      }, { status: 401 });
    }

    // Veritabanı İşlemi (Upsert)
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        fid: fid,
        username: username,
        pfp_url: pfp || null,
        wallet_address: address,
        city: city || "Global",
        bio: talents || "",
      }, { onConflict: 'fid' });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Profile POST Error:", error);
    return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
  }
}