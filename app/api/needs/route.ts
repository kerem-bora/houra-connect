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
  wallet_address: z.string().startsWith("0x"),
  price: z.union([z.string(), z.number()]).optional(),
});

// --- FETCH ALL NEEDS (READ) ---
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('needs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ needs: data });
  } catch (error: any) {
    console.error("Fetch Needs Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// --- CREATE NEW NEED (POST with 3-per-day limit) ---
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validate Input
    const validation = NeedSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        error: "Invalid input data", 
        details: validation.error.format() 
      }, { status: 400 });
    }

    const { fid, username, location, text, wallet_address, price } = validation.data;

    // 2. Rate Limit Check: Max 3 needs per 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { count, error: countError } = await supabase
      .from('needs')
      .select('*', { count: 'exact', head: true })
      .eq('fid', fid)
      .gt('created_at', twentyFourHoursAgo);

    if (countError) throw countError;

    if (count !== null && count >= 3) {
      return NextResponse.json({ 
        error: "Daily limit reached. You can post up to 3 needs every 24 hours." 
      }, { status: 429 });
    }

    // 3. Database Insertion
    const { error: dbError } = await supabase
      .from('needs')
      .insert([{ fid, username, location, text, wallet_address, price }]);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Post Need Error:", error);
    return NextResponse.json({ error: "Failed to post need" }, { status: 500 });
  }
}

// --- DELETE NEED (Secure Delete) ---
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const fid = searchParams.get('fid');

    if (!id || !fid) {
      return NextResponse.json({ error: "ID and FID are required" }, { status: 400 });
    }

    // SECURITY: Delete only if both ID and FID match
    const { data, error } = await supabase
      .from('needs')
      .delete()
      .eq('id', id)
      .eq('fid', parseInt(fid))
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        error: "Need not found or unauthorized action" 
      }, { status: 403 });
    }

    return NextResponse.json({ success: true, message: "Need deleted successfully" });
  } catch (error: any) {
    console.error("Delete Need Error:", error);
    return NextResponse.json({ error: "Failed to delete need" }, { status: 500 });
  }
}