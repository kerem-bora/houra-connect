import { NextResponse } from "next/server";
import { kv } from "@vercel/kv"; // Vercel KV (Redis) veya Postgres/Supabase kullanabilirsin. 
// Burada en hızlısı ve basit olan KV örneği üzerinden gidiyorum.

export async function GET() {
  try {
    // Tüm ihtiyaçları "needs" anahtarından çekiyoruz
    const needs = await kv.get("houra_needs") as any[];
    
    // Eğer liste boşsa boş dizi döndür, varsa yeniden eskiye sırala
    const sortedNeeds = needs ? needs.reverse() : [];
    
    return NextResponse.json({ needs: sortedNeeds });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch needs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fid, username, location, text } = body;

    if (!text || !fid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Mevcut ihtiyaçları çek
    const existingNeeds = await kv.get("houra_needs") as any[] || [];

    const newNeed = {
      fid,
      username,
      location: location || "Global",
      text,
      createdAt: new Date().toISOString()
    };

    // Yeni ihtiyacı en başa ekle veya listeye pushla
    const updatedNeeds = [...existingNeeds, newNeed];
    
    // Veritabanına kaydet
    await kv.set("houra_needs", updatedNeeds);

    return NextResponse.json({ success: true, need: newNeed });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}