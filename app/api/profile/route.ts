import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Schema validation including the new nick field
const ProfileSchema = z.object({
  fid: z.number(),
  username: z.string().min(1).trim(),
  pfp: z.string().optional().nullable(),
  // NICK alanı eklendi
  nick: z.string().optional().nullable().transform(val => val?.trim() || null),
  city: z
    .string()
    .optional()
    .nullable()
    .transform(val => val?.trim().replace(/<[^>]*>/g, "") || null),
  talents: z
    .string()
    .optional()
    .nullable()
    .transform(val => val?.trim().replace(/<[^>]*>/g, "") || null),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  token: z.string().optional(), 
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validation = ProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const { fid, username, city, talents, address, nick } = validation.data;

    // Security check: Verify FID from headers matches the body
    const headerFid = req.headers.get("x-farcaster-fid");
    if (!headerFid || Number(headerFid) !== fid) {
      return NextResponse.json({ error: "Profile is not verified (FID mismatch)" }, { status: 401 });
    }

    // Wallet ownership check
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('fid', fid)
      .maybeSingle();

    if (existingProfile && existingProfile.wallet_address.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ 
        error: "Access Denied: Wallet mismatch" 
      }, { status: 403 });
    }

    // Upsert profile data including the new nick column
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        fid: fid,
        username: username,
        nick: nick,
        city: city || "Global",
        bio: talents || "",
        wallet_address: address.toLowerCase(), 
      }, { onConflict: 'fid' });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Profile POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get("fid");

    // Fetch all profiles if no specific FID is provided
    if (!fid) {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map profiles to include a fallback display_name
      const formattedProfiles = profiles.map(p => ({
        ...p,
        talents: p.bio, // Ensure UI compatibility
        display_name: p.nick || p.username // Fallback to username if nick is null
      }));

      return NextResponse.json({ profiles: formattedProfiles });
    }

    // Fetch a single profile by FID
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('fid', Number(fid))
      .maybeSingle(); 

    if (error) throw error;
    
    return NextResponse.json({ 
      profile: data ? { 
        ...data, 
        talents: data.bio,
        display_name: data.nick || data.username 
      } : null 
    });
  } catch (error: any) {
    console.error("Profile GET Error:", error);
    return NextResponse.json({ error: "Data Fetching Error" }, { status: 500 });
  }
}