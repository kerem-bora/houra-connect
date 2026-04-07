import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


const ProfileSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  nick: z.string().optional().nullable().transform(val => val?.trim() || null),
  city: z
    .string()
    .optional()
    .nullable()
    .transform(val => val?.trim().replace(/<[^>]*>/g, "") || "Global"),
  talents: z
    .string()
    .optional()
    .nullable()
    .transform(val => val?.trim().replace(/<[^>]*>/g, "") || ""),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validation = ProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const { address, nick, city, talents } = validation.data;

    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        wallet_address: address.toLowerCase(), 
        nick: nick,
        city: city,
        bio: talents, 
        updated_at: new Date().toISOString(),
      }, { onConflict: 'wallet_address' });

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
    const address = searchParams.get("address");

      if (!address) {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedProfiles = profiles.map(p => ({
        ...p,
        talents: p.bio, 
        display_name: p.nick || "Anonymous" 
      }));

      return NextResponse.json({ profiles: formattedProfiles });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', address.toLowerCase())
      .maybeSingle(); 

    if (error) throw error;
    
    return NextResponse.json({ 
      profile: data ? { 
        ...data, 
        talents: data.bio,
        display_name: data.nick || "Anonymous" 
      } : null 
    });
  } catch (error: any) {
    console.error("Profile GET Error:", error);
    return NextResponse.json({ error: "Data Fetching Error" }, { status: 500 });
  }
}