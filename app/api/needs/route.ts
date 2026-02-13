import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- INPUT VALIDATION SCHEMA ---
const NeedSchema = z.object({
  fid: z.number(),
  username: z.string().min(1).max(50),
  location: z.string().max(100).optional().default("Global"),
  text: z.string().min(3).max(280),
  price: z.union([z.string(), z.number()]).optional().default("1"),
  wallet_address: z.string().startsWith("0x").optional(),
});

// --- FETCH ALL NEEDS ---
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('needs')
      // 'id' yerine 'uuid' çekiyoruz
      .select('uuid, fid, username, location, text, price, wallet_address, created_at') 
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ needs: data });
  } catch (error: any) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: "Database fetch failed" }, { status: 500 });
  }
}

// --- CREATE NEW NEED ---
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

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('needs')
      .select('*', { count: 'exact', head: true })
      .eq('fid', fid)
      .gt('created_at', twentyFourHoursAgo);

    if (countError) {
      console.error("Rate limit error:", countError);
    } else if (count !== null && count >= 3) {
      return NextResponse.json({ error: "Daily limit reached (3 posts max)" }, { status: 429 });
    }

    const { error: dbError } = await supabase
      .from('needs')
      .insert([{ fid, username, location, text, price, wallet_address }]);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Post Error:", error);
    return NextResponse.json({ error: "Server error during post" }, { status: 500 });
  }
}

// --- DELETE NEED (Secure by UUID and FID) ---
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    // 'id' yerine 'uuid' alıyoruz
    const uuid = searchParams.get('uuid'); 
    const fid = searchParams.get('fid');

    if (!uuid || !fid) {
      return NextResponse.json({ error: "Missing UUID or FID" }, { status: 400 });
    }

    // FID hala sayı olmalı, ama UUID string kalmalı
    const targetFid = Number(fid);

    if (isNaN(targetFid)) {
      return NextResponse.json({ error: "FID must be a number" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('needs')
      .delete()
      .eq('uuid', uuid)
      .eq('fid', targetFid)
      .select();

    if (error) {
      console.error("Delete Error:", error);
      return NextResponse.json({ error: "Database delete failed" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        error: "Unauthorized: Post not found or you don't own it" 
      }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}