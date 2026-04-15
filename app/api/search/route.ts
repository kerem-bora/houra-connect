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

const searchTerm = query.trim().replace(/[%_\\(),"']/g, "");
if (searchTerm.length < 2) return NextResponse.json({ users: [] });

    const { data, error } = await supabase
      .from('profiles')
      .select('nick, avatar_url, city, bio, wallet_address')
      .or(`nick.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) {
      console.error("Supabase Search Error:", error);
      throw error;
    }

    const formattedUsers = (data || []).map(user => ({
      ...user,
      display_name: user.nick || "Anonymous"
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error: any) {
    console.error("Search API Failure:", error);
    return NextResponse.json(
      { error: "Search failed"},
      { status: 500 }
    );
  }
}