import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- INPUT VALIDATION SCHEMA ---
const ProfileSchema = z.object({
  fid: z.number(),
  username: z.string().min(1).max(50),
  pfp: z.string().url().optional().or(z.literal("")),
  city: z.string().max(100).optional().default("Global"),
  talents: z.string().max(500).optional().default(""), // Maps to 'bio' in DB
  address: z.string().startsWith("0x").optional(),
});

// --- FETCH PROFILE (READ) ---
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get('fid');

    if (!fid) {
      return NextResponse.json({ error: "FID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('city, bio')
      .eq('fid', parseInt(fid))
      .single();

    // If no record exists, return empty profile instead of an error
    if (error && error.code === 'PGRST116') {
      return NextResponse.json({ profile: { city: "", bio: "" } });
    }

    if (error) throw error;

    return NextResponse.json({ profile: data });
  } catch (error: any) {
    console.error("Fetch Profile Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// --- UPDATE/CREATE PROFILE (UPSERT) ---
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validate Input
    const validation = ProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        error: "Invalid profile data", 
        details: validation.error.format() 
      }, { status: 400 });
    }

    const { fid, username, pfp, city, talents, address } = validation.data;

    // 2. Database Upsert
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        fid: fid,
        username: username,
        avatar_url: pfp,
        city: city,
        bio: talents,
        wallet_address: address,
      }, { onConflict: 'fid' });

    if (dbError) {
      console.error("Supabase Upsert Error:", dbError);
      return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}