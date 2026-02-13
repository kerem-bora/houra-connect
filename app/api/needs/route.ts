import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { decodeJwt } from "jose";
import { verifyMessage } from "viem";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NeedSchema = z.object({
  fid: z.number(),
  username: z.string().min(1).max(50),
  location: z.string().max(100).optional().default("Global"),
  text: z.string().min(3).max(280),
  price: z.union([z.string(), z.number()]).optional().default("1"),
  wallet_address: z.string().startsWith("0x"),
});

/**
 * Farcaster Auth Token Doğrulama (Manuel Yöntem)
 * createAppClient kütüphanesindeki hataları bypass eder.
 */
async function verifyFarcasterAuth(req: Request, expectedFid: number) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return false;
    
    const token = authHeader.split(" ")[1];
    if (!token) return false;

    // 1. Token'ı parçala (Kütüphane bağımlılığı olmadan)
    const payload = decodeJwt(token) as any;

    // 2. Temel Veri Kontrolleri
    if (!payload || payload.fid !== expectedFid) {
      console.error("FID Mismatch or No Payload");
      return false;
    }

    // 3. Zaman Kontrolü (Token süresi dolmuş mu?)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      console.error("Token Expired");
      return false;
    }

    // 4. Kriptografik İmza Doğrulaması (Viem ile)
    const isVerified = await verifyMessage({
      address: payload.address as `0x${string}`,
      message: payload.message,
      signature: payload.signature as `0x${string}`,
    });

    return isVerified;
  } catch (err) {
    console.error("Auth System Crash:", err);
    return false;
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase.from('needs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ needs: data });
  } catch (error: any) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = NeedSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: "Invalid format" }, { status: 400 });

    const { fid, username, location, text, price, wallet_address } = validation.data;

    // --- MANUEL DOĞRULAMA ---
    const isAuthorized = await verifyFarcasterAuth(req, fid);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized: Invalid identity token" }, { status: 401 });
    }

    // Rate Limit (Günde 3)
    const { count } = await supabase.from('needs')
      .select('*', { count: 'exact', head: true })
      .eq('fid', fid)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (count !== null && count >= 3) return NextResponse.json({ error: "Daily limit (3)" }, { status: 429 });

    const { error: dbError } = await supabase.from('needs').insert([{
      fid, username, location, text, price: price.toString(), wallet_address, id: crypto.randomUUID()
    }]);

    if (dbError) throw dbError;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST Crash:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const fid = searchParams.get('fid');
    if (!id || !fid) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    if (!(await verifyFarcasterAuth(req, Number(fid)))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase.from('needs').delete().eq('id', id).eq('fid', Number(fid));
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}