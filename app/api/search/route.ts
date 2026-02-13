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

    // Boş veya çok kısa aramaları engelle
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Arama terimini temizle
    const searchTerm = query.trim();

    // Supabase Sorgusu: 
    // Username, City (Location) veya Bio (Offer) içinde büyük/küçük harf duyarsız arama yapar.
    const { data, error } = await supabase
      .from('profiles')
      .select('fid, username, avatar_url, city, bio, wallet_address')
      .or(`username.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) {
      console.error("Supabase Search Error:", error);
      throw error;
    }

    return NextResponse.json({ users: data || [] });
  } catch (error: any) {
    console.error("Search API Failure:", error);
    return NextResponse.json(
      { error: "Search failed", details: error.message }, 
      { status: 500 }
    );
  }
}