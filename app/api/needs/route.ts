import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAppClient, viemConnector } from "@farcaster/auth-client"; // Base/Farcaster Auth kütüphanesi

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Auth doğrulama için istemciyi hazırla
const appClient = createAppClient({
  ethereum: viemConnector(),
});

const NeedSchema = z.object({
  fid: z.number(),
  username: z.string().min(1).max(50),
  location: z.string().max(100).optional().default("Global"),
  text: z.string().min(3).max(280),
  price: z.union([z.string(), z.number()]).optional().default("1"),
  wallet_address: z.string().startsWith("0x"),
});

// Yardımcı Fonksiyon: Token Doğrulama
async function verifyFarcasterAuth(req: Request, expectedFid: number) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.split(" ")[1];
  
  const { data, error } = await appClient.verifySignInToken({
    token,
    domain: "houra.example.com", // Kendi domain adresini yazmalısın
  });

  // Token geçerli mi ve Token içindeki FID, işlem yapılmak istenen FID ile aynı mı?
  return !error && data && data.fid === expectedFid;
}

export async function GET() {
  try {
    const { data, error } = await supabase.from('needs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ needs: data });
  } catch (error: any) {
    return NextResponse.json({ error: "Database fetch failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = NeedSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const { fid, username, location, text, price, wallet_address } = validation.data;

    // --- BASE AUTH VERIFICATION ---
    const isAuthorized = await verifyFarcasterAuth(req, fid);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized: Invalid Auth Token" }, { status: 401 });
    }

    // Rate Limit (Günde 3 paylaşım)
    const { count } = await supabase.from('needs')
      .select('*', { count: 'exact', head: true })
      .eq('fid', fid)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (count !== null && count >= 3) {
      return NextResponse.json({ error: "Daily limit reached (3 needs max)" }, { status: 429 });
    }

    const { error: dbError } = await supabase.from('needs').insert([{
      fid, 
      username, 
      location, 
      text, 
      price: price.toString(), 
      wallet_address, 
      id: crypto.randomUUID()
    }]);

    if (dbError) throw dbError;
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idValue = searchParams.get('id'); 
    const fidValue = searchParams.get('fid');

    if (!idValue || !fidValue) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const fid = Number(fidValue);

    // --- BASE AUTH VERIFICATION ---
    const isAuthorized = await verifyFarcasterAuth(req, fid);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized Delete Attempt" }, { status: 401 });
    }

    // Silme işlemini yaparken sadece ID değil, FID kontrolünü de veritabanı seviyesinde yapıyoruz
    const { error } = await supabase.from('needs').delete()
      .eq('id', idValue)
      .eq('fid', fid);

    if (error) throw error;
    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: "Delete operation failed" }, { status: 500 });
  }
}