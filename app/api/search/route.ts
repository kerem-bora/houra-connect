import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Username, City veya Bio (Talents) içinde arama yap
    const { data, error } = await supabase
      .from('profiles')
      .select('fid, username, avatar_url, city, bio, wallet_address')
      .or(`username.ilike.%${query}%,city.ilike.%${query}%,bio.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;

    return NextResponse.json({ users: data || [] });
  } catch (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}