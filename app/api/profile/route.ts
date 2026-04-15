import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSession } from "@/lib/getSession"; // ✅ YENİ

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ProfileSchema = z.object({
  // ✅ address artık schema'da yok, session'dan geliyor
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
    // ✅ Adresi session'dan al, client'a güvenme
    const session = await getSession();
    if (!session.isLoggedIn || !session.address) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const address = session.address;

    const body = await req.json();
    const validation = ProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const { nick, city, talents } = validation.data;

    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        wallet_address: address, // session'dan geliyor
        nick,
        city,
        bio: talents,
      }, { onConflict: 'wallet_address' });

    if (dbError) {
      if (dbError.code === "23505" && dbError.message.includes("nick")) {
        return NextResponse.json(
          { error: "This username is already taken." },
          { status: 409 }
        );
      }
      throw dbError;
    }

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

      return NextResponse.json({
        profiles: profiles.map(p => ({
          ...p,
          talents: p.bio,
          display_name: p.nick || "Anonymous"
        }))
      });
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