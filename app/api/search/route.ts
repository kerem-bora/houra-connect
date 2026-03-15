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

    // Block empty or too short queries
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] });
    }

    const searchTerm = query.trim();

    // Supabase Query: 
    // Now searches across username, nick, city, and bio using case-insensitive ilike
    const { data, error } = await supabase
      .from('profiles')
      .select('fid, username, nick, avatar_url, city, bio, wallet_address')
      .or(`username.ilike.%${searchTerm}%,nick.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) {
      console.error("Supabase Search Error:", error);
      throw error;
    }

    // Format results to include the display_name logic (nick priority)
    const formattedUsers = (data || []).map(user => ({
      ...user,
      display_name: user.nick || user.username // Fallback to username if nick is null
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error: any) {
    console.error("Search API Failure:", error);
    return NextResponse.json(
      { error: "Search failed", details: error.message }, 
      { status: 500 }
    );
  }
}