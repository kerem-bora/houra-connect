import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Yeni Şema: safeContext eklendi, signature/message kaldırıldı
const NeedSchema = z.object({
  fid: z.number(),
  username: z.string().min(1).max(50),
  location: z.string().max(100).optional().default("Global"),
  text: z.string().min(3).max(280),
  price: z.union([z.string(), z.number()]).optional().default("1"),
  wallet_address: z.string().startsWith("0x"),
  safeContext: z.object({
    user: z.object({
      fid: z.number(),
    })
  }).passthrough()
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
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const { fid, username, location, text, price, wallet_address, safeContext } = validation.data;

    // --- KRİTİK KİMLİK DOĞRULAMA ---
    const headerFid = req.headers.get("x-farcaster-fid");
    if (
      !headerFid || 
      Number(headerFid) !== fid || 
      safeContext.user.fid !== fid
    ) {
      return NextResponse.json({ error: "Identity mismatch! POST rejected." }, { status: 401 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idValue = searchParams.get('id'); 
    const fidValue = searchParams.get('fid');
    const body = await req.json();
    const { safeContext, address } = body;

    if (!idValue || !fidValue || !address || !safeContext) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // --- KRİTİK SİLME KONTROLÜ ---
    const headerFid = req.headers.get("x-farcaster-fid");
    
    // 1. Header'daki FID, 2. URL'deki FID, 3. safeContext içindeki FID hepsi aynı olmalı
    if (
      !headerFid || 
      Number(headerFid) !== Number(fidValue) ||
      safeContext.user.fid !== Number(fidValue)
    ) {
      return NextResponse.json({ error: "Unauthorized delete attempt!" }, { status: 403 });
    }

    // Veritabanından silme (Sadece sahibi silebilir)
    const { error } = await supabase.from('needs').delete()
      .eq('id', idValue)
      .eq('fid', Number(fidValue))
      .eq('wallet_address', address);

    if (error) throw error;
    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}