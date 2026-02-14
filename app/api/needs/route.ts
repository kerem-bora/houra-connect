import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NeedSchema = z.object({
  fid: z.number(),
  username: z.string().min(1).max(50).trim(),
  location: z
    .string()
    .max(100)
    .optional()
    .default("Global")
    .transform(val => val.trim().replace(/<[^>]*>/g, "")),
  text: z
    .string()
    .min(3)
    .max(280)
    .transform(val => val.trim().replace(/<[^>]*>/g, "")),
  price: z.coerce.string().default("1"),
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/), 
});

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('needs')
      .select('*')
      .order('created_at', { ascending: false });
      
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
      console.error("Validation Error:", validation.error.format());
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const { fid, username, location, text, price, wallet_address } = validation.data;

    // 1. ADIM: Header FID Kontrolü
    const headerFid = req.headers.get("x-farcaster-fid");
    if (!headerFid || Number(headerFid) !== fid) {
      return NextResponse.json({ error: "Identity mismatch!" }, { status: 401 });
    }

    // 2. ADIM: Zorunlu Profil ve Adres Eşleşme Kontrolü
    // Bu kısım "üye olmayan" veya "başkasının cüzdanını kullanan" kişileri eler.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('fid', fid)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found. Please create a profile first." }, { status: 403 });
    }

    if (profile.wallet_address.toLowerCase() !== wallet_address.toLowerCase()) {
      return NextResponse.json({ error: "Wallet address mismatch with profile!" }, { status: 403 });
    }

    // 3. ADIM: Rate Limit
    const { count } = await supabase.from('needs')
      .select('*', { count: 'exact', head: true })
      .eq('fid', fid)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (count !== null && count >= 3) {
      return NextResponse.json({ error: "Daily limit reached (3 max)" }, { status: 429 });
    }

    // 4. ADIM: Kayıt
    const { error: dbError } = await supabase.from('needs').insert([{
      fid, 
      username, 
      location, 
      text, 
      price, 
      wallet_address: wallet_address.toLowerCase(), 
      id: crypto.randomUUID()
    }]);

    if (dbError) throw dbError;
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Needs POST Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idValue = searchParams.get('id'); 
    const fidValue = searchParams.get('fid');
    const body = await req.json();

    if (!idValue || !fidValue || !body.address) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 1. ADIM: Header FID Kontrolü
    const headerFid = req.headers.get("x-farcaster-fid");
    if (!headerFid || Number(headerFid) !== Number(fidValue)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 2. ADIM: Sahiplik Kontrolü (DB'deki orijinal kayıt üzerinden)
    const { data: originalNeed } = await supabase
      .from('needs')
      .select('wallet_address')
      .eq('id', idValue)
      .single();

    if (!originalNeed) return NextResponse.json({ error: "Need not found" }, { status: 404 });

    // Cüzdan adresi uyuşmuyorsa silme!
    if (originalNeed.wallet_address.toLowerCase() !== body.address.toLowerCase()) {
      return NextResponse.json({ error: "Ownership mismatch!" }, { status: 403 });
    }

    const { error } = await supabase.from('needs')
      .delete()
      .eq('id', idValue)
      .eq('wallet_address', body.address.toLowerCase());

    if (error) throw error;
    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}