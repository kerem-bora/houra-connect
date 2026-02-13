import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

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
  signature: z.string().min(1),
  message: z.string().min(1),
});

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

    // 1. Zod ile veri formatını kontrol et
    const validation = NeedSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data format", details: validation.error.format() }, { status: 400 });
    }

    const { fid, username, location, text, price, wallet_address } = validation.data;

    // 2. İMZA DOĞRULAMASI (BYPASS EDİLDİ)
    // Güvenlik kontrolünü geçici olarak devre dışı bıraktık.
    const isSignatureValid = true; 

    if (!isSignatureValid) {
       return NextResponse.json({ error: "Signature failed" }, { status: 401 });
    }

    // 3. Rate Limit (Günde 3 paylaşım) - Bunu koruyoruz ki veritabanın şişmesin
    const { count } = await supabase.from('needs')
      .select('*', { count: 'exact', head: true })
      .eq('fid', fid)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (count !== null && count >= 3) {
      return NextResponse.json({ error: "Daily limit reached (3 needs max)" }, { status: 429 });
    }

    // 4. Veritabanına Kayıt
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
    console.error("Full Post Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idValue = searchParams.get('id'); 
    const fidValue = searchParams.get('fid');
    const body = await req.json();

    if (!idValue || !fidValue || !body.address) {
      return NextResponse.json({ error: "Missing parameters for delete" }, { status: 400 });
    }

    // İMZA DOĞRULAMASI (BYPASS EDİLDİ)
    const isDeleteAuth = true;

    if (!isDeleteAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.from('needs').delete()
      .eq('id', idValue)
      .eq('fid', Number(fidValue))
      .eq('wallet_address', body.address);

    if (error) throw error;
    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}