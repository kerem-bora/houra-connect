import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decodeJwt } from "jose"; // Jose ekledik
import { verifyMessage } from "viem";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    // 1. Token'ı jose ile güvenli parçala
    const payload = decodeJwt(token) as any;
    
    // 2. Güvenlik Kontrolleri (FID ve Zaman)
    if (!payload || payload.fid !== body.fid) {
      return NextResponse.json({ error: "FID mismatch or invalid token" }, { status: 401 });
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    // 3. İmzayı doğrula
    const isValid = await verifyMessage({
      address: payload.address as `0x${string}`,
      message: payload.message,
      signature: payload.signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 4. Veritabanı (Upsert)
    const { error: dbError } = await supabase.from('profiles').upsert({
      fid: body.fid,
      username: body.username,
      pfp_url: body.pfp,
      wallet_address: body.address,
      city: body.city || "Global",
      bio: body.talents || "",
    }, { onConflict: 'fid' });

    if (dbError) throw dbError;
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Critical Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
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
    
    return NextResponse.json({ profile: data });
  } catch {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}