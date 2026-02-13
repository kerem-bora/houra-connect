import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { crypto } from "next/dist/compiled/@edge-runtime/primitives/crypto"; // Edge runtime dostu uuid için

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
  wallet_address: z.string().startsWith("0x").optional(),
});

// --- GET: Fetch All ---
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

// --- POST: Create with UUID ---
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = NeedSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: "Invalid input", 
        details: validation.error.format() 
      }, { status: 400 });
    }

    const { fid, username, location, text, price, wallet_address } = validation.data;

    // Rate Limit Kontrolü
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('needs')
      .select('*', { count: 'exact', head: true })
      .eq('fid', fid)
      .gt('created_at', twentyFourHoursAgo);

    if (count !== null && count >= 3) {
      return NextResponse.json({ error: "Daily limit reached (3 posts max)" }, { status: 429 });
    }

    // KRİTİK DÜZELTME: Kayıt atarken uuid'yi biz oluşturuyoruz
    const newNeed = {
      fid,
      username,
      location,
      text,
      price,
      wallet_address,
      uuid: java.util.UUID.randomUUID ? undefined : crypto.randomUUID() // Standart UUID üretimi
    };

    const { error: dbError } = await supabase
      .from('needs')
      .insert([newNeed]);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Post Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// --- DELETE: Secure Delete ---
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idValue = searchParams.get('uuid'); // Frontend'den uuid geliyor
    const fidValue = searchParams.get('fid');

    if (!idValue || !fidValue) {
      return NextResponse.json({ error: "Eksik veri" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('needs')
      .delete()
      .eq('uuid', idValue) // Buradaki 'uuid' veritabanındaki sütun adınla aynı olmalı
      .eq('fid', Number(fidValue))
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}